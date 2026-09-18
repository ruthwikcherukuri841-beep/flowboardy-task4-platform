import mongoose from "mongoose";
import { makeUid, makeUsername } from "../utils/userMeta.js";

const json = {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  },
};

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, unique: true, index: true }, // short public id, "FB-7KQ2XM"
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true }, // "@handle"
    name: { type: String, required: true, minlength: 2, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "email must be valid"],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, default: "Member", trim: true },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "", trim: true, maxlength: 220 },
    location: { type: String, default: "", trim: true, maxlength: 80 },
  },
  { timestamps: true }
);

// Auto-issue the short public id and @handle whenever a new account is saved,
// with uniqueness retries so both stay rock-solid even under concurrent signups.
const ensureIdentity = async function () {
  if (!this.uid) {
    let uid;
    for (let tries = 0; tries < 8 && !uid; tries++) {
      const candidate = makeUid();
      if (!(await this.constructor.exists({ uid: candidate }))) uid = candidate;
    }
    if (!uid) throw new Error("Unable to allocate a unique public id");
    this.uid = uid;
  }
  if (!this.username) {
    const base = makeUsername(this.name);
    let username;
    for (let tries = 0; tries < 24 && !username; tries++) {
      const candidate = tries === 0 ? base : `${base}${tries + 1}`;
      if (!(await this.constructor.exists({ username: candidate }))) username = candidate;
    }
    if (!username) throw new Error("Unable to allocate a unique username");
    this.username = username;
  }
};
userSchema.pre("save", ensureIdentity);

userSchema.set("toJSON", json);

export const User = mongoose.models.User ?? mongoose.model("User", userSchema);
