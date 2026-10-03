/* CCNA Exam C — 100 original questions, ids c001–c100. Authored in two halves (domains 1/2/6 and 3/4/5);
   the exam runner shuffles item order and option order at sitting time. Schema: dev/specs/ccna.md §6. */
import { CCNA_BANK_C_P1 } from "./bank-c.p1.js";
import { CCNA_BANK_C_P2 } from "./bank-c.p2.js";
export const CCNA_BANK_C = [...CCNA_BANK_C_P1, ...CCNA_BANK_C_P2];
