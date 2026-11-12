// Step names for the flows. Plain data, so both the screens and the Home logic can use them.
export const INWARD_STEPS = ["Match stones to certificates", "QC", "Hallmark, capture HUID", "Re-weigh after hallmark", "Jewellery report (IGI or SGL)"];
export const SALE_STEPS = ["Pending payment", "Reserved", "Payment verified", "Picked", "QC", "Packed", "Shipped", "Delivered"];
export const MTO_STEPS = ["Pending payment", "Advance paid", "Manufacturing order", "In production", "QC and certification", "Packed", "Dispatched", "Delivered"];
export const REPAIR_STEPS = ["Intake", "Assessed", "Quoted", "Approved", "In repair", "Repair QC", "Ready", "Delivered"];

// What to do next on an online order, indexed by its current step.
export const SALE_ACTIONS = ["Reserve the piece", "Verify the payment", "Pick it", "Check it", "Pack it", "Ship it", "Mark it delivered"];
export const MTO_ACTIONS = ["Take the advance", "Raise the manufacturing order", "Start production", "Check and certify it", "Pack it", "Dispatch it", "Mark it delivered"];
