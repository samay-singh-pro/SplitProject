import { configureStore } from "@reduxjs/toolkit";
import signupReducer from "./signupSlice";
import loginReducer from "./loginSlice";
import groupReducer from "./groupSlice";
import expenseReducer from "./expenseSlice";
import statsReducer from "./statsSlice";
import inviteReducer from "./inviteSlice";
import personalReducer from "./personalSlice";

const store = configureStore({
  reducer: {
    signup: signupReducer,
    login: loginReducer,
    group: groupReducer,
    expense: expenseReducer,
    stats: statsReducer,
    invite: inviteReducer,
    personal: personalReducer,
  },
});
export default store;
