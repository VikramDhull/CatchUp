import mongoose from "mongoose";

// connect to mongodb database
export const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () =>
      console.log("Database Connected")
    );
    await mongoose.connect(`${process.env.MONGODB_URI}/catchup`);
  } catch (error) {
    console.log(error);
  }
};
