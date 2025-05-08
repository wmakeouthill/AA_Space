import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/entities';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface AuthRequest extends Request {
    user?: { id: number; username: string; isAdmin?: boolean };
}

// Diretório para armazenar as imagens de perfil - usando caminho absoluto para evitar problemas
const UPLOAD_DIR = path.resolve(path.join(__dirname, '../../uploads/profiles'));
console.log('[PROFILE CONTROLLER] Diretório de uploads configurado:', UPLOAD_DIR);

// Garantir que o diretório de upload existe com permissões corretas
try {
    if (!fs.existsSync(UPLOAD_DIR)) {
        console.log('[PROFILE CONTROLLER] Criando diretório de uploads:', UPLOAD_DIR);
        fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o777 });
    } else {
        console.log('[PROFILE CONTROLLER] Diretório de uploads já existe:', UPLOAD_DIR);
        // Garantir permissões adequadas
        fs.chmodSync(UPLOAD_DIR, 0o777);
    }
} catch (error) {
    console.error('[PROFILE CONTROLLER] Erro ao verificar/criar diretório de uploads:', error);
}

// Função para processar e salvar uma imagem de base64
const saveBase64Image = (base64Data: string, userId: number): string => {
    console.log(`[PROFILE CONTROLLER] Processando imagem para o usuário ${userId}`);
    
    // Remover cabeçalho da imagem base64 se existir
    const match = base64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    
    if (!match) {
        console.error('[PROFILE CONTROLLER] Formato de imagem base64 inválido');
        throw new Error('Formato de imagem base64 inválido');
    }
    
    const imageType = match[1]; // jpeg, png, etc.
    const base64Image = match[2];
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    // Gerar um nome de arquivo único
    const filename = `${userId}_${crypto.randomBytes(8).toString('hex')}.${imageType}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    console.log(`[PROFILE CONTROLLER] Salvando imagem em: ${filePath}`);
    
    // Salvar o arquivo
    try {
        fs.writeFileSync(filePath, imageBuffer);
        console.log(`[PROFILE CONTROLLER] Imagem salva com sucesso: ${filePath}`);
    } catch (error) {
        console.error('[PROFILE CONTROLLER] Erro ao salvar imagem:', error);
        throw new Error(`Erro ao salvar imagem: ${(error as Error).message}`);
    }
    
    // Verificar se o arquivo foi realmente criado
    if (!fs.existsSync(filePath)) {
        console.error('[PROFILE CONTROLLER] Arquivo não foi criado após a gravação');
        throw new Error('Falha ao verificar arquivo após a gravação');
    }
    
    // Retornar o caminho relativo para o banco de dados - garantir que começa com /
    return `/uploads/profiles/${filename}`;
}

// Método para fazer upload de uma nova imagem de perfil
export const uploadProfileImage = async (req: Request, res: Response) => {
    console.log('[PROFILE CONTROLLER] Iniciando uploadProfileImage');
    
    try {
        const userId = (req as AuthRequest).user?.id;
        console.log('[PROFILE CONTROLLER] ID do usuário:', userId);
        
        if (!userId) {
            console.log('[PROFILE CONTROLLER] Usuário não autenticado');
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        
        // Verificar se a requisição contém uma imagem
        const { profileImage } = req.body;
        
        if (!profileImage) {
            console.log('[PROFILE CONTROLLER] Imagem de perfil não fornecida');
            return res.status(400).json({ message: 'Imagem de perfil não fornecida' });
        }
        
        // Salvar a imagem e obter o caminho
        let imagePath;
        try {
            imagePath = saveBase64Image(profileImage, userId);
            console.log(`[PROFILE CONTROLLER] Imagem salva com sucesso, caminho: ${imagePath}`);
        } catch (error) {
            console.error('[PROFILE CONTROLLER] Erro ao salvar imagem:', error);
            return res.status(400).json({ 
                message: 'Erro ao processar imagem', 
                details: (error as Error).message 
            });
        }
        
        // Atualizar o usuário no banco de dados
        const userRepository = AppDataSource.getRepository(User);
        
        // Se o usuário já tinha uma imagem de perfil, excluir a antiga
        const user = await userRepository.findOneBy({ id: userId });
        
        if (!user) {
            console.log('[PROFILE CONTROLLER] Usuário não encontrado no banco de dados');
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        if (user.profileImage) {
            try {
                console.log(`[PROFILE CONTROLLER] Usuário já possui imagem: ${user.profileImage}`);
                // Construir caminho absoluto para o arquivo
                const oldFilePath = path.resolve(path.join(__dirname, '../../', user.profileImage.substring(1)));
                console.log(`[PROFILE CONTROLLER] Tentando remover imagem antiga: ${oldFilePath}`);
                
                // Verificar se o arquivo existe antes de tentar excluir
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                    console.log(`[PROFILE CONTROLLER] Imagem antiga removida: ${oldFilePath}`);
                } else {
                    console.log(`[PROFILE CONTROLLER] Imagem antiga não encontrada: ${oldFilePath}`);
                }
            } catch (error) {
                console.error('[PROFILE CONTROLLER] Erro ao remover imagem antiga:', error);
                // Não falhar o processo por causa da remoção da imagem antiga
            }
        }
        
        // Atualizar o caminho da imagem no banco de dados
        await userRepository.update(userId, { profileImage: imagePath });
        console.log(`[PROFILE CONTROLLER] Banco de dados atualizado para o usuário ${userId}`);
        
        // Verificar a URL completa para depuração
        const requestOrigin = req.headers.origin || '';
        const apiUrl = requestOrigin.replace(/-4200\./, '-3001.');
        const fullImageUrl = `${apiUrl}${imagePath}`;
        console.log(`[PROFILE CONTROLLER] URL completa da imagem: ${fullImageUrl}`);
        
        return res.status(200).json({ 
            message: 'Imagem de perfil atualizada com sucesso',
            profileImage: imagePath,
            fullImageUrl: fullImageUrl
        });
    } catch (error) {
        console.error('[PROFILE CONTROLLER] Erro ao atualizar imagem de perfil:', error);
        return res.status(500).json({ 
            message: 'Erro interno do servidor',
            details: (error as Error).message
        });
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
            
            // Atualizar o usuário no banco de dados - usando string vazia ao invés de null
            await userRepository.update(userId, { profileImage: "" });
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
        console.log('[PROFILE CONTROLLER] Iniciando getCurrentUserProfile');
        const userId = (req as AuthRequest).user?.id;
        console.log('[PROFILE CONTROLLER] userId:', userId);
        
        if (!userId) {
            console.log('[PROFILE CONTROLLER] Usuário não autenticado');
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        
        // Buscar informações do usuário
        const userRepository = AppDataSource.getRepository(User);
        console.log('[PROFILE CONTROLLER] Buscando usuário no banco de dados');
        const user = await userRepository.findOneBy({ id: userId });
        
        if (!user) {
            console.log('[PROFILE CONTROLLER] Usuário não encontrado');
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        console.log('[PROFILE CONTROLLER] Usuário encontrado:', user.username);
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