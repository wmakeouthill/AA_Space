import { AppDataSource } from '../config/database';
import { Reward } from '../models/entities';
import { UserReward } from '../models/entities';
import { User } from '../models/entities';

export class RewardService {
    private rewardRepository = AppDataSource.getRepository(Reward);
    private userRewardRepository = AppDataSource.getRepository(UserReward);
    private userRepository = AppDataSource.getRepository(User);

    async getAllRewards(): Promise<Reward[]> {
        return this.rewardRepository.find();
    }    async getUserRewards(userId: number): Promise<UserReward[]> {
        return this.userRewardRepository.find({
            where: { user_id: userId },
            relations: ['reward'], // Para incluir os detalhes da recompensa
        });
    }

    async getUserRewardsByUsername(username: string): Promise<UserReward[]> {
        const user = await this.userRepository.findOneBy({ username: username });
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        return this.userRewardRepository.find({
            where: { user_id: user.id },
            relations: ['reward'], // Para incluir os detalhes da recompensa
        });
    }async grantRewardToUser(userId: number, rewardId: number, awardedByUserId: number): Promise<UserReward> {
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        const reward = await this.rewardRepository.findOneBy({ id: rewardId });
        if (!reward) {
            throw new Error('Recompensa não encontrada');
        }

        const awardedByUser = await this.userRepository.findOneBy({ id: awardedByUserId });
        if (!awardedByUser) {
            throw new Error('Usuário que está concedendo a recompensa não encontrado');
        }

        // Verifica se o usuário já possui esta recompensa (opcional, dependendo da regra de negócio)
        const existingUserReward = await this.userRewardRepository.findOne({
            where: { user_id: userId, reward_id: rewardId }
        });

        if (existingUserReward) {
            throw new Error('Usuário já possui esta recompensa');
        }

        const newUserReward = this.userRewardRepository.create({
            user_id: userId,
            reward_id: rewardId,
            awardedByUserId: awardedByUserId,
            user: user,
            reward: reward,
            awardedBy: awardedByUser
        });

        return this.userRewardRepository.save(newUserReward);
    }

    async grantRewardToUserByUsername(username: string, rewardId: number, awardedByUserId: number): Promise<UserReward> {
        const user = await this.userRepository.findOneBy({ username: username });
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        const reward = await this.rewardRepository.findOneBy({ id: rewardId });
        if (!reward) {
            throw new Error('Recompensa não encontrada');
        }

        const awardedByUser = await this.userRepository.findOneBy({ id: awardedByUserId });
        if (!awardedByUser) {
            throw new Error('Usuário que está concedendo a recompensa não encontrado');
        }

        // Verifica se o usuário já possui esta recompensa
        const existingUserReward = await this.userRewardRepository.findOne({
            where: { user_id: user.id, reward_id: rewardId }
        });

        if (existingUserReward) {
            throw new Error('Usuário já possui esta recompensa');
        }

        const newUserReward = this.userRewardRepository.create({
            user_id: user.id,
            reward_id: rewardId,
            awardedByUserId: awardedByUserId,
            user: user,
            reward: reward,
            awardedBy: awardedByUser
        });

        return this.userRewardRepository.save(newUserReward);
    }

    async findRewardById(rewardId: number): Promise<Reward | null> {
        return this.rewardRepository.findOneBy({ id: rewardId });
    }

    // Novo método para zerar todas as recompensas de um usuário
    async clearUserRewards(username: string): Promise<{ deletedCount: number }> {
        const user = await this.userRepository.findOneBy({ username: username });
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        const result = await this.userRewardRepository.delete({ user_id: user.id });
        return { deletedCount: result.affected || 0 };
    }

    // Novo método para remover uma recompensa específica de um usuário
    async removeUserReward(username: string, rewardId: number): Promise<{ removed: boolean }> {
        const user = await this.userRepository.findOneBy({ username: username });
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        const reward = await this.rewardRepository.findOneBy({ id: rewardId });
        if (!reward) {
            throw new Error('Recompensa não encontrada');
        }

        const result = await this.userRewardRepository.delete({
            user_id: user.id,
            reward_id: rewardId
        });

        if (result.affected === 0) {
            throw new Error('Usuário não possui esta recompensa');
        }

        return { removed: true };
    }
}
