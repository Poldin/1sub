/**
 * Vendors Domain - Public API
 *
 * Handles vendor application workflows, approval processes, and vendor status management.
 */

export {
  createVendorApplication,
  getVendorApplicationByUserId,
  getAllVendorApplications,
  processVendorApplication,
  isUserVendor,
  updateApplicationStatus,
  type VendorApplication,
  type VendorApplicationWithUser,
} from './service';
