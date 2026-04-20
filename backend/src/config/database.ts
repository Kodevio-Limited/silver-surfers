import mongoose from "mongoose";

import { logger } from "./logger.ts";

const databaseLogger = logger.child("database");

let hasConnected = false;

export async function connectDatabase(uri?: string): Promise<void> {
    if (!uri) {
        databaseLogger.warn("MONGO_URL is not configured; starting without a database connection.");
        return;
    }

    if (hasConnected) {
        return;
    }

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
    });

    hasConnected = true;
    databaseLogger.info("Connected to MongoDB.");
}

export async function disconnectDatabase(): Promise<void> {
    if (mongoose.connection.readyState === 0) {
        return;
    }

    await mongoose.disconnect();
    hasConnected = false;
    databaseLogger.info("Disconnected from MongoDB.");
}
