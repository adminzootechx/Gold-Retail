// Step names for the flows. Plain data, so both the screens and the Home logic can use them.
export const INWARD_STEPS = ["Match stones to certificates", "QC", "Hallmark, capture HUID", "Re-weigh after hallmark", "Jewellery report (IGI or SGL)"];
export const SALE_STEPS = ["Pending payment", "Payment verified", "Sales order created, piece reserved", "Picked", "QC", "Packed", "Shipped", "Delivered"];
export const MTO_STEPS = ["Pending payment", "Payment verified", "Manufacturing order", "In production", "QC and certification", "Packed", "Dispatched", "Delivered"];
export const REPAIR_STEPS = ["Intake", "Assessed", "Quoted", "Approved", "In repair", "Repair QC", "Ready", "Delivered"];

// What to do next on an online order, indexed by its current step.
export const SALE_ACTIONS = ["Verify the payment", "Create the sales order and reserve the piece", "Pick it", "Check it", "Pack it", "Ship it", "Mark it delivered"];
export const MTO_ACTIONS = ["Verify the payment", "Raise the manufacturing order", "Start production", "Check and certify it", "Pack it", "Dispatch it", "Mark it delivered"];
