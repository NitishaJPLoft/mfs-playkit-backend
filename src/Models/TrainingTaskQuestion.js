import { Schema, model } from 'mongoose';

export const trainingTaskQuestionSchema = new Schema({
    trainingTask: {
        type: Schema.Types.ObjectId,
        ref: 'TrainingTask',
        required: true
    },
    question: {
        type: String,
        required: true
    },
    answer: {
        type: Number,
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    createdIp: {
        type: String,
        required: true
    },
    updatedIp: {
        type: String,
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
}, { timestamps: true});

trainingTaskQuestionSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        delete ret.__v;
        return ret;
    },
});

const TrainingTaskQuestion = model('TrainingTaskQuestion', trainingTaskQuestionSchema);

export default TrainingTaskQuestion;
