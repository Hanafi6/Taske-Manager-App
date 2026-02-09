import { createSlice } from "@reduxjs/toolkit";

const Modals = createSlice({
    name: "modals",
    initialState: {
        OpenDatilsDeleteProject: false,
        ListOfUsers: false,
        ContextMeneuDimention: {top: 0, left: 0},
        ShowContextMeneu: false,
        SelectElement: null,
    },
    reducers: {
        setOpenDiitailsDelete(state, action) {
            state.OpenDatilsDeleteProject = action.payload;
        },
        setListOfUsers(state, action) {
            state.ListOfUsers = action.payload;
        },
        setContextMeneuDimention(state, action) {
            state.ContextMeneuDimention = action.payload;
        },
        setShowContextMeneu(state, action) {
            state.ShowContextMeneu = action.payload;
        },
        setSelectElement(state, action) {
            state.SelectElement = action.payload;
        },
    },
});


export const { setOpenDiitailsDelete,setListOfUsers, setContextMeneuDimention, setShowContextMeneu, setSelectElement } = Modals.actions;
export default Modals.reducer;