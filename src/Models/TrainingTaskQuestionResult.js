import { Schema, model } from 'mongoose';

export const trainingTaskQuestionResultSchema = new Schema({
    trainingResult :{
        type: Schema.Types.ObjectId,
        ref: 'TrainingResult',
        required: true
    },
    trainingTaskQuestion: {
        type: Schema.Types.ObjectId,
        ref: 'TrainingTaskQuestion'
    },
    answer: {
        type: Number,
        required: true
    },
    correctAnswer: {
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

trainingTaskQuestionResultSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        delete ret.__v;
        return ret;
    },
});

const TrainingTaskQuestionResult = model('TrainingTaskQuestionResult', trainingTaskQuestionResultSchema);

export default TrainingTaskQuestionResult;
