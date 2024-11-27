import { memo } from "react";


export const typedMemo: <T,>(comp: T) => T = memo