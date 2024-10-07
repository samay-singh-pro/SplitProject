import mongoose from "mongoose";
export const connection = async () => {
    mongoose.connect(process.env.MONGO_URI, {
        dbName: 'SPLIT_MONEY_APPLICATION',
    }).then(()=> {
        console.log('connected to databse');
    }).catch((error)=> {
        console.log('error');
    })
}