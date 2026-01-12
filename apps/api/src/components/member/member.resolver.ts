import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import type { ObjectId } from 'mongoose';

// ===== Nest Guards and Decorators =====
import { AuthGuard } from '../auth/guards/auth.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

// ===== Enums =====
import { MemberType } from '../../libs/enums/member.enum';

// ===== DTOs =====
import { Member, Members } from '../../libs/dto/member/member';
import { LoginInput, MemberInput, MembersInquiry, OrganizersInquiry } from '../../libs/dto/member/member.input';
import { MemberUpdateInput } from '../../libs/dto/member/member.update';

// ===== Config =====
import { shapeIntoMongoObjectId } from '../../libs/config';

// ===== Services =====
import { MemberService } from './member.service';
import { CurrencyService } from '../currency/currency.service';

@Resolver()
export class MemberResolver {
	constructor(
		private readonly memberService: MemberService,
		private readonly currencyService: CurrencyService,
	) {}

	// ============== Authentication Methods ==============
	@Mutation(() => Member)
	public async signup(@Args('input') input: MemberInput): Promise<Member> {
		console.log('Mutation: signup');
		return await this.memberService.signup(input);
	}

	@Mutation(() => Member)
	public async login(@Args('input') input: LoginInput): Promise<Member> {
		console.log('Mutation: login');
		return await this.memberService.login(input);
	}

	// @UseGuards(AuthGuard)
	// @Mutation(() => Member)
	// public async updatePassword(
	// 	@Args('input') input: PasswordUpdateInput,
	// 	@AuthMember('_id') memberId: ObjectId,
	// ): Promise<Member> {
	// 	console.log('Mutation: updatePassword');
	// 	return await this.memberService.updatePassword(memberId, input);
	// }

	// @UseGuards(AuthGuard)
	// @Mutation(() => Member)
	// public async resetPassword(@Args('input') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Member> {
	// 	console.log('Mutation: resetPassword');
	// 	console.log('memberId', memberId);
	// 	return await this.memberService.resetPassword(memberId, input);
	// }

	// ============== Profile Management Methods ==============
	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async updateMember(
		@Args('input') input: MemberUpdateInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Member> {
		console.log('Mutation: updateMember');
		return await this.memberService.updateMember(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => String)
	public checkAuthRoles(@AuthMember() authMember: Member): string {
		console.log('Query: checkAuthRoles');
		const memberId = (authMember._id as { toString(): string }).toString();
		return `Hi ${authMember.username}, you are ${authMember.memberType} and id: ${memberId}`;
	}

	// ============== Member Interaction Methods ==============
	@UseGuards(WithoutGuard)
	@Query(() => Member)
	public async getMember(@Args('memberId') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Member> {
		console.log('Query: getMember');
		const targetId = shapeIntoMongoObjectId(input);
		return await this.memberService.getMember(memberId, targetId);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Members)
	public async getOrganizers(
		@Args('input') input: OrganizersInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Members> {
		console.log('Query: getOrganizers');
		return await this.memberService.getOrganizers(memberId, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Member)
	public async getOrganizer(@Args('input') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Member> {
		console.log('Query: getOrganizer');
		const targetId = shapeIntoMongoObjectId(input);
		return await this.memberService.getOrganizer(memberId, targetId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async likeTargetMember(@Args('memberId') input: string, @AuthMember() authMember: Member): Promise<Member> {
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.memberService.likeTargetMember(authMember, likeRefId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async deleteAccount(@AuthMember('_id') memberId: ObjectId): Promise<Member> {
		console.log('Mutation: deleteAccount');
		return await this.memberService.deleteAccount(memberId);
	}

	// ============== Admin Methods ==============
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Members)
	public async getAllMembersByAdmin(@Args('input') input: MembersInquiry): Promise<Members> {
		console.log('Query: getAllMembersByAdmin');
		return await this.memberService.getAllMembersByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Member)
	public async updateMemberByAdmin(@Args('input') input: MemberUpdateInput): Promise<Member> {
		console.log('Mutation: updateMemberByAdmin');
		return await this.memberService.updateMemberByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Member)
	public async removeMemberByAdmin(@Args('input') input: string): Promise<Member> {
		console.log('Mutation: removeMemberByAdmin');
		const memberId = shapeIntoMongoObjectId(input);
		return await this.memberService.removeMemberByAdmin(memberId);
	}
}
