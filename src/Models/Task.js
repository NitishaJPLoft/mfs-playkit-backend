import {Schema, model} from 'mongoose';

const taskSchema = new Schema({
    language: {
        type: Schema.Types.ObjectId,
        ref: 'Language'
    },
    name: {
        type: String,
        index: true
    },
    slug: {
        type: String,
        required: true
    },
    phase: {
        type: Schema.Types.ObjectId,
        ref: 'Phase'
    },
    taskNumber: {
        type: Schema.Types.ObjectId,
        ref: 'TaskNumber'
    },
    movementType: {
        type: Schema.Types.ObjectId,
        ref: 'MovementType'
    },
    assessIt: {
        type: Array,
        default: []
    },
    stages: {},
    playItThumb: String,

    playItIOD: String,
    isPlayItIOD: Boolean,
    typeOfPlayItIOD: String,

    assessItThumb: String,

    assessItIOD: String,
    isAssessItIOD: Boolean,
    typeOfAssessItIOD: String,

    assessItVideo: String,
    isAssessItVideo: Boolean,

    activityCard: String,
    isActivityCard: Boolean,
    nextUrl: [{
        url: {
            type: Schema.Types.ObjectId,
            ref: 'Task'
        }
    }],
    isDeleted: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
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
}, {timestamps: true});

taskSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        delete ret.__v;
        return ret;
    },
});

const Task = model('Task', taskSchema);

export default Task;
