import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
    id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.models.counter || mongoose.model('counter', counterSchema);

export default Counter;
