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
    }

    async getUserRewards(userId: number): Promise<UserReward[]> {
        return this.userRewardRepository.find({
            where: { user_id: userId },
            relations: ['reward'], // Para incluir os detalhes da recompensa
        });
    }

    async grantRewardToUser(userId: number, rewardId: number, awardedByUserId: number): Promise<UserReward> {
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

    async findRewardById(rewardId: number): Promise<Reward | null> {
        return this.rewardRepository.findOneBy({ id: rewardId });
    }
}
