import { 
  onDocumentCreated, 
  onDocumentUpdated 
} from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const db = getFirestore();

// 1. Auto-Numbering for Proposals
// Trigger: onCreate of 'proposals/{proposalId}'
export const onProposalCreate = onDocumentCreated('proposals/{proposalId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const proposal = snapshot.data();
    
    // Check if code is already assigned (to prevent double assignment)
    if (proposal.proposalCode) return;

    const year = new Date().getFullYear() + 543; // Thai Year
    const counterRef = db.collection('counters').doc(`proposals_${year}`);

    try {
        const code = await db.runTransaction(async (t) => {
            const doc = await t.get(counterRef);
            let count = 1;
            if (doc.exists) {
                count = doc.data()?.count + 1;
            }
            t.set(counterRef, { count }, { merge: true });
            
            // Format: REC-YYYY-XXXX (e.g., REC-2567-0001)
            return `REC-${year}-${String(count).padStart(4, '0')}`;
        });

        // Update the proposal with the new code
        await snapshot.ref.update({ proposalCode: code });
        logger.info(`Assigned code ${code} to proposal ${event.params.proposalId}`);
    } catch (error) {
        logger.error("Failed to generate proposal code", error);
    }
});

// 2. Security: Prevent Unauthorized Status Changes
// Trigger: onUpdate of 'proposals/{proposalId}'
export const onProposalUpdate = onDocumentUpdated('proposals/{proposalId}', async (event) => {
    const change = event.data;
    if (!change) return;

    const newData = change.after.data();
    const oldData = change.before.data();

    // Example: Only Admin can change status to APPROVED
    if (newData.status === 'APPROVED' && oldData.status !== 'APPROVED') {
        // In Cloud Functions, we don't have 'currentUser' context directly in the trigger data 
        // unless we store 'updatedBy' field in the document from the client.
        
        // If we want strict enforcement, we check the 'updatedBy' field (which client sends)
        // and verify their role from DB.
        
        const updaterId = newData.updatedBy; // Client must send this
        if (!updaterId) {
            // Revert change if no updater info
            logger.warn(`Attempt to approve without updater ID. Reverting.`);
            await change.after.ref.update({ status: oldData.status });
            return;
        }

        const userDoc = await db.collection('users').doc(updaterId).get();
        const user = userDoc.data();

        if (!user || !user.roles.includes('ADMIN')) {
            logger.warn(`Unauthorized approval attempt by ${updaterId}. Reverting.`);
            await change.after.ref.update({ status: oldData.status });
        }
    }
});

// 3. Security: Immutable Fields
// Prevent changing 'proposalCode' after it's set
export const protectImmutableFields = onDocumentUpdated('proposals/{proposalId}', async (event) => {
    const change = event.data;
    if (!change) return;

    const newData = change.after.data();
    const oldData = change.before.data();

    if (oldData.proposalCode && newData.proposalCode !== oldData.proposalCode) {
        logger.warn(`Attempt to change immutable field proposalCode. Reverting.`);
        await change.after.ref.update({ proposalCode: oldData.proposalCode });
    }
});
