import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { T } from '../../libs/types/common';
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
		} catch (error) {
			throw new UnauthorizedException(Message.SOMETHING_WENT_WRONG);
		}
	}

	public async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
		try {
			return await bcrypt.compare(password, hashedPassword);
		} catch (error) {
			throw new UnauthorizedException(Message.SOMETHING_WENT_WRONG);
		}
	}

	public async createToken(member: Member): Promise<string> {
		try {
			const payload: T = {};
			Object.keys(member['_doc'] ? member['_doc'] : member).map((ele) => {
				payload[`${ele}`] = member[`${ele}`];
			});
			delete payload.memberPassword;

			return await this.jwtService.signAsync(payload, {
				secret: process.env.SECRET_TOKEN,
				expiresIn: '30d',
			});
		} catch (error) {
			throw new UnauthorizedException(Message.SOMETHING_WENT_WRONG);
		}
	}

	public async verifyToken(token: string): Promise<Member> {
		try {
			const member = await this.jwtService.verifyAsync(token, {
				secret: process.env.SECRET_TOKEN,
			});
			member._id = shapeIntoMongoObjectId(member._id);
			return member;
		} catch (error) {
			throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
		}
	}
}
