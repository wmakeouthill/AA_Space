import { Response } from 'express'; // Request foi removido daqui
import { RewardService } from '../services/reward.service';
import { User } from '../models/entities'; // Import User para tipagem
import { AuthRequest } from '../middleware/auth.middleware'; // Importar AuthRequest

const rewardService = new RewardService();

export const getAllRewards = async (req: AuthRequest, res: Response) => { // Alterado para AuthRequest
    try {
        const rewards = await rewardService.getAllRewards();
        res.json(rewards);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Erro desconhecido ao buscar recompensas' });
        }
    }
};

export const getUserRewards = async (req: AuthRequest, res: Response) => { // Alterado para AuthRequest
    try {
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'ID de usuário inválido' });
        }
        const userRewards = await rewardService.getUserRewards(userId);
        res.json(userRewards);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Erro desconhecido ao buscar recompensas do usuário' });
        }
    }
};

export const getUserRewardsByUsername = async (req: AuthRequest, res: Response) => {
    try {
        const username = req.params.username;
        if (!username) {
            return res.status(400).json({ message: 'Username é obrigatório' });
        }
        const userRewards = await rewardService.getUserRewardsByUsername(username);
        res.json(userRewards);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Usuário não encontrado') {
                return res.status(404).json({ message: error.message });
            }
            res.status(500).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Erro desconhecido ao buscar recompensas do usuário' });
        }
    }
};

export const grantRewardToUser = async (req: AuthRequest, res: Response) => { // Alterado para AuthRequest
    try {
        const { username, rewardId } = req.body;
        const awardedByUserId = (req.user as User).id; // Pega o ID do usuário autenticado (que está concedendo)

        if (!username || !rewardId) {
            return res.status(400).json({ message: 'username e rewardId são obrigatórios' });
        }

        const newReward = await rewardService.grantRewardToUserByUsername(username, rewardId, awardedByUserId);
        res.status(201).json(newReward);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Usuário não encontrado' || error.message === 'Recompensa não encontrada' || error.message === 'Usuário que está concedendo a recompensa não encontrado') {
                return res.status(404).json({ message: error.message });
            }
            if (error.message === 'Usuário já possui esta recompensa') {
                return res.status(409).json({ message: error.message });
            }
            res.status(500).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Erro desconhecido ao conceder recompensa' });
        }
    }
};

// Opcional: Controlador para popular as recompensas iniciais (apenas para admins)
export const seedRewards = async (req: AuthRequest, res: Response) => { // Alterado para AuthRequest
    const rewardsData = [
        { milestone: "24 Horas", name: "Nova Aurora", designConcept: "Sol nascente sutil, chama de vela única, círculo simples.", colorPalette: "Amarelo suave, branco" },
        { milestone: "1 Semana", name: "Trilha Constante", designConcept: "Caminho começando, broto pequeno.", colorPalette: "Verde claro" },
        { milestone: "2 Semanas", name: "Compromisso Firme", designConcept: "Broto com pequenas raízes visíveis.", colorPalette: "Verde intermediário" },
        { milestone: "1 Mês", name: "Renovação Mensal", designConcept: "Círculo simbolizando um mês, talvez com uma pequena folha.", colorPalette: "Bronze digital, verde vibrante" },
        { milestone: "2 Meses", name: "Força Contínua", designConcept: "Duas folhas ou um broto mais forte.", colorPalette: "Bronze avermelhado" },
        { milestone: "3 Meses", name: "Raízes Crescentes", designConcept: "Broto com sistema radicular mais definido.", colorPalette: "Verde escuro" },
        { milestone: "6 Meses", name: "Expandindo Horizontes", designConcept: "Árvore jovem com alguns galhos.", colorPalette: "Azul (cor tradicional)" },
        { milestone: "9 Meses", name: "Jornada de Reflexão", designConcept: "Árvore com mais folhagem, talvez um símbolo de introspecção.", colorPalette: "Roxo suave, azul profundo" },
        { milestone: "1 Ano", name: "Círculo da Serenidade", designConcept: "Círculo completo, árvore estilizada, Oração da Serenidade.", colorPalette: "Dourado digital" },
        { milestone: "18 Meses", name: "Dedicação Profunda", designConcept: "Árvore mais robusta.", colorPalette: "Prata digital, dourado claro" },
        { milestone: "2 Anos", name: "Gratidão em Flor", designConcept: "Árvore florescendo, duas estrelas.", colorPalette: "Dourado, tons vibrantes" },
        { milestone: "3 Anos", name: "Pilares da Recuperação", designConcept: "Três pilares ou uma árvore com três galhos principais.", colorPalette: "Dourado, verde esmeralda" },
        { milestone: "5 Anos", name: "Estrela Guia da Sabedoria", designConcept: "Estrela proeminente, árvore frondosa.", colorPalette: "Dourado intenso, platina" },
        { milestone: "10 Anos", name: "Carvalho da Fortaleza", designConcept: "Imagem de um carvalho forte e resiliente.", colorPalette: "Dourado, tons de terra" },
        { milestone: "15 Anos", name: "Farol de Esperança", designConcept: "Farol emitindo luz.", colorPalette: "Platina, azul luminoso" },
        { milestone: "20 Anos", name: "Legado de Inspiração", designConcept: "Montanha alcançada, círculo radiante.", colorPalette: "Platina, branco brilhante" }
    ];

    try {
        for (const data of rewardsData) {
            const existingReward = await rewardService['rewardRepository'].findOne({ where: { name: data.name } });
            if (!existingReward) {
                await rewardService['rewardRepository'].save(rewardService['rewardRepository'].create(data));
            }
        }
        res.status(201).json({ message: 'Recompensas iniciais populadas com sucesso!' });
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Erro desconhecido ao popular recompensas' });
        }
    }
};

// Novo controlador para zerar recompensas de um usuário
export const clearUserRewards = async (req: AuthRequest, res: Response) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'Username é obrigatório' });
        }

        const result = await rewardService.clearUserRewards(username);
        res.status(200).json({
            message: `${result.deletedCount} recompensa(s) removida(s) do usuário ${username}`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Usuário não encontrado') {
                return res.status(404).json({ message: error.message });
            }
            res.status(500).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Erro desconhecido ao zerar recompensas do usuário' });
        }
    }
};

// Novo controlador para remover uma recompensa específica de um usuário
export const removeUserReward = async (req: AuthRequest, res: Response) => {
    try {
        const { username, rewardId } = req.body;

        if (!username || !rewardId) {
            return res.status(400).json({ message: 'Username e rewardId são obrigatórios' });
        }

        const result = await rewardService.removeUserReward(username, rewardId);
        res.status(200).json({
            message: `Recompensa removida com sucesso do usuário ${username}`,
            removed: result.removed
        });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Usuário não encontrado' || error.message === 'Recompensa não encontrada') {
                return res.status(404).json({ message: error.message });
            }
            if (error.message === 'Usuário não possui esta recompensa') {
                return res.status(409).json({ message: error.message });
            }
            res.status(500).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Erro desconhecido ao remover recompensa do usuário' });
        }
    }
};
