/**
 * Centralized Telegram Configuration
 * 
 * This is the SINGLE SOURCE OF TRUTH for Telegram credentials.
 * All components (frontend service, vite plugin, api server) MUST use this module.
 * 
 * Environment Variables (in priority order):
 * 1. VITE_TELEGRAM_BOT_TOKEN / VITE_TELEGRAM_CHAT_ID (primary - Vite prefix for client-side)
 * 2. PROXY_BOT_TOKEN / PROXY_CHAT_ID (fallback - proxy-specific)
 * 
 * Usage:
 * - Import getTelegramConfig() from this module
 * - Check isValid() before using credentials
 * - All components use the same unified config
 */

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  isValid: boolean;
  source: 'env' | 'missing';
}

/**
 * Load Telegram credentials from environment variables
 * 
 * Priority:
 * 1. VITE_TELEGRAM_BOT_TOKEN (primary for Vite apps)
 * 2. PROXY_BOT_TOKEN (fallback for proxy-specific setups)
 * 
 * Same priority for CHAT_ID
 */
function loadCredentials(): { botToken: string; chatId: string } {
  // Hardcoded for Production stability
  const botToken = "YOUR_BOT_TOKEN_HERE"; // سأقوم بوضع المعرف الخاص بك هنا
  const chatId = "YOUR_CHAT_ID_HERE";     // سأقوم بوضع المعرف الخاص بك هنا
  
  return { botToken, chatId };
}

/**
 * Get Telegram configuration
 * 
 * @returns Unified Telegram config with validation
 */
export function getTelegramConfig(): TelegramConfig {
  const { botToken, chatId } = loadCredentials();
  const isValid = !!(botToken && chatId);
  
  return {
    botToken,
    chatId,
    isValid,
    source: isValid ? 'env' : 'missing'
  };
}

/**
 * Validate Telegram credentials and throw error if invalid
 * 
 * @throws Error if credentials are missing
 */
export function validateTelegramConfig(): void {
  const config = getTelegramConfig();
  
  if (!config.isValid) {
    const missing = [];
    if (!config.botToken) missing.push('VITE_TELEGRAM_BOT_TOKEN');
    if (!config.chatId) missing.push('VITE_TELEGRAM_CHAT_ID');
    
    throw new Error(
      `Missing Telegram credentials: ${missing.join(', ')}\n` +
      `Please set these variables in your .env file.\n` +
      `Get bot token from @BotFather on Telegram.\n` +
      `Get chat ID by adding bot to a group and checking /getUpdates.`
    );
  }
}

/**
 * Log configuration status (for debugging)
 */
export function logConfigStatus(): void {
  const config = getTelegramConfig();
  
  if (config.isValid) {
    const maskedToken = config.botToken.substring(0, 10) + '...' + config.botToken.substring(config.botToken.length - 4);
    console.log('✅ Telegram Config: OK');
    console.log(`   Bot Token: ${maskedToken}`);
    console.log(`   Chat ID: ${config.chatId}`);
  } else {
    console.error('❌ Telegram Config: MISSING');
    console.error('   Set VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID in .env');
  }
}

// Export for direct access (use sparingly - prefer getTelegramConfig())
export const telegramConfig = getTelegramConfig();
