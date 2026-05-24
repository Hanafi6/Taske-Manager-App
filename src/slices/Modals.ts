// src/slices/Modals.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/* ------------------ Types & Interfaces ------------------ */

interface ContextMenuDimensions {
    top: number;
    left: number;
}

interface ModalsState {
    OpenDatilsDeleteProject: boolean;
    ListOfUsers: boolean;
    ContextMeneuDimention: ContextMenuDimensions;
    ShowContextMeneu: boolean;
    SelectElement: any; // تقدر تستبدل any بنوع العنصر الفعلي لو عاوز (مثلاً string | number | object)
}

/* ------------------ Initial State ------------------ */

const initialState: ModalsState = {
    OpenDatilsDeleteProject: false,
    ListOfUsers: false,
    ContextMeneuDimention: { top: 0, left: 0 },
    ShowContextMeneu: false,
    SelectElement: null,
};

/* ------------------ Slice ------------------ */

const Modals = createSlice({
    name: "modals",
    initialState,
    reducers: {
        setOpenDiitailsDelete(state, action: PayloadAction<boolean>) {
            state.OpenDatilsDeleteProject = action.payload;
        },
        setListOfUsers(state, action: PayloadAction<boolean>) {
            state.ListOfUsers = action.payload;
        },
        setContextMeneuDimention(state, action: PayloadAction<ContextMenuDimensions>) {
            state.ContextMeneuDimention = action.payload;
        },
        setShowContextMeneu(state, action: PayloadAction<boolean>) {
            state.ShowContextMeneu = action.payload;
        },
        setSelectElement(state, action: PayloadAction<any>) {
            state.SelectElement = action.payload;
        },
    },
});

export const {
    setOpenDiitailsDelete,
    setListOfUsers,
    setContextMeneuDimention,
    setShowContextMeneu,
    setSelectElement
} = Modals.actions;

export default Modals.reducer;