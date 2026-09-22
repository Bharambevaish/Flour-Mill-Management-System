import "server-only";

import mongoose from "mongoose";
import { getEnv } from "@/lib/env";

const globalForMongoose = globalThis as unknown as {
  mongooseConnection?: Promise<typeof mongoose>;
};

export async function connectDb(): Promise<typeof mongoose> {
  if (globalForMongoose.mongooseConnection) {
    return globalForMongoose.mongooseConnection;
  }

  const { MONGODB_URI } = getEnv();

  const connection = mongoose
    .connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    .then((m) => m)
    .catch((err) => {
      globalForMongoose.mongooseConnection = undefined;
      throw err;
    });

  globalForMongoose.mongooseConnection = connection;
  return connection;
}

export async function dbStatus(): Promise<boolean> {
  return mongoose.connection.readyState === 1;
}