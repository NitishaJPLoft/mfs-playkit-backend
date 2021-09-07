import {Schema, model} from 'mongoose';

export const pagesSchema = new Schema({
    title: {
        type: String,
        required: true,
        index: true
    },
    language: {
        type: Schema.Types.ObjectId,
        ref: 'Language',
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    headingLine1: String,
    headingLine2: String,
    bodyText: String,
    primaryLable: String,
    secondryLable: String,
    sectionHeading1: String,
    sectionHeading2: String,
    sectionHeading3: String,
    slug: {
        type: String,
        required: true,
        unique: true
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
}, {timestamps: true});

pagesSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        delete ret.__v;
        return ret;
    },
});

const Pages = model('Pages', pagesSchema);

export default Pages;
