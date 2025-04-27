import { ObjectId } from 'bson';
import { ObjectId as MongooseId } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { T } from './types/common';

export const shapeIntoMongoObjectId = (target: any) => {
	return typeof target === 'string' ? new ObjectId(target) : target;
};

// IMAGE CONFIGURATION
export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
export const getSerialForImage = (filename: string) => {
	const ext = path.parse(filename).ext;
	return uuidv4() + ext;
};

export const availableOrganizersSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews'];
export const availableMembersSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews', 'memberFollowers'];
