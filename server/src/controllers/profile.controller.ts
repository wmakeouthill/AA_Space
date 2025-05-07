import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/entities';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface AuthRequest extends Request {
    user?: { id: number; username: string; isAdmin?: boolean };
}

// Diretório para armazenar as imagens de perfil
const UPLOAD_DIR = path.join(__dirname, '../../uploads/profiles');

// Garantir que o diretório de upload existe
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Função para processar e salvar uma imagem de base64
const saveBase64Image = (base64Data: string, userId: number): string => {
    // Remover cabeçalho da imagem base64 se existir
    const match = base64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    
    if (!match) {
        throw new Error('Formato de imagem base64 inválido');
    }
    
    const imageType = match[1]; // jpeg, png, etc.
    const base64Image = match[2];
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    // Gerar um nome de arquivo único
    const filename = `${userId}_${crypto.randomBytes(8).toString('hex')}.${imageType}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    // Salvar o arquivo
    fs.writeFileSync(filePath, imageBuffer);
    
    // Retornar o caminho relativo para o banco de dados
    return `/uploads/profiles/${filename}`;
}

// Método para fazer upload de uma nova imagem de perfil
export const uploadProfileImage = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.id;
        
        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        
        // Verificar se a requisição contém uma imagem
        const { profileImage } = req.body;
        
        if (!profileImage) {
            return res.status(400).json({ message: 'Imagem de perfil não fornecida' });
        }
        
        // Salvar a imagem e obter o caminho
        let imagePath;
        try {
            imagePath = saveBase64Image(profileImage, userId);
        } catch (error) {
            return res.status(400).json({ message: 'Formato de imagem inválido' });
        }
        
        // Atualizar o usuário no banco de dados
        const userRepository = AppDataSource.getRepository(User);
        
        // Se o usuário já tinha uma imagem de perfil, excluir a antiga
        const user = await userRepository.findOneBy({ id: userId });
        
        if (user && user.profileImage) {
            const oldFilePath = path.join(__dirname, '../../', user.profileImage.substring(1));
            
            // Verificar se o arquivo existe antes de tentar excluir
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }
        
        // Atualizar o caminho da imagem no banco de dados
        await userRepository.update(userId, { profileImage: imagePath });
        
        return res.status(200).json({ 
            message: 'Imagem de perfil atualizada com sucesso',
            profileImage: imagePath
        });
    } catch (error) {
        console.error('Erro ao atualizar imagem de perfil:', error);
        return res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

// Método para remover a imagem de perfil
export const removeProfileImage = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.id;
        
        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        
        // Buscar informações do usuário
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOneBy({ id: userId });
        
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        if (user.profileImage) {
            // Excluir o arquivo de imagem
            const filePath = path.join(__dirname, '../../', user.profileImage.substring(1));
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            
            // Atualizar o usuário no banco de dados
            await userRepository.update(userId, { profileImage: null });
        }
        
        return res.status(200).json({ message: 'Imagem de perfil removida com sucesso' });
    } catch (error) {
        console.error('Erro ao remover imagem de perfil:', error);
        return res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

// Método para obter a imagem de perfil de um usuário pelo ID
export const getUserProfileInfo = async (req: Request, res: Response) => {
    try {
        const requesterId = (req as AuthRequest).user?.id;
        const targetUserId = parseInt(req.params.id);
        
        if (!requesterId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        
        // Buscar informações do usuário solicitado
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOneBy({ id: targetUserId });
        
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        // Retornar apenas informações públicas
        return res.status(200).json({
            id: user.id,
            username: user.username,
            profileImage: user.profileImage
        });
    } catch (error) {
        console.error('Erro ao buscar informações de perfil:', error);
        return res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

// Método para obter perfil do usuário atual
export const getCurrentUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.id;
        
        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        
        // Buscar informações do usuário
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOneBy({ id: userId });
        
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        return res.status(200).json({
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            profileImage: user.profileImage,
            isAdmin: user.isAdmin
        });
    } catch (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        return res.status(500).json({ message: 'Erro interno do servidor' });
    }
};