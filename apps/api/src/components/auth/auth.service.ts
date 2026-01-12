import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Member } from '../../libs/dto/member/member';
import { JwtService } from '@nestjs/jwt';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Message } from '../../libs/enums/common.enum';

@Injectable()
export class AuthService {
	constructor(private jwtService: JwtService) {}

	public async hashPassword(memberPassword: string): Promise<string> {
		try {
			const salt = await bcrypt.genSalt(10);
			return await bcrypt.hash(memberPassword, salt);
		} catch {
			throw new UnauthorizedException(Message.SOMETHING_WENT_WRONG);
		}
	}

	public async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
		try {
			return await bcrypt.compare(password, hashedPassword);
		} catch {
			throw new UnauthorizedException(Message.SOMETHING_WENT_WRONG);
		}
	}

	public async createToken(member: Member): Promise<string> {
		try {
			const memberData = (member['_doc'] ? member['_doc'] : member) as Record<string, any>;
			const payload = { ...memberData };
			delete payload.memberPassword;

			return await this.jwtService.signAsync(payload, {
				secret: process.env.SECRET_TOKEN,
				expiresIn: '30d',
			});
		} catch {
			throw new UnauthorizedException(Message.SOMETHING_WENT_WRONG);
		}
	}

	public async verifyToken(token: string): Promise<Member> {
		try {
			const payload = await this.jwtService.verifyAsync<Member>(token, {
				secret: process.env.SECRET_TOKEN,
			});
			payload._id = shapeIntoMongoObjectId(payload._id);
			return payload;
		} catch {
			throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
		}
	}
}
