"use client"

import { useState } from "react"

const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
const MAX_KEYS = 3

export default function Page() {
  const [keyCount, setKeyCount] = useState(1)
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" })
  const [generatedScript, setGeneratedScript] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showResult, setShowResult] = useState(false)

  const getAllApiKeys = () => {
    const keys: string[] = []
    for (let i = 0; i < keyCount; i++) {
      const input = document.getElementById(`apiKey${i}`) as HTMLInputElement
      if (input && input.value.trim()) {
        keys.push(input.value.trim())
      }
    }
    return keys
  }

  const validateApiKey = async (apiKey: string) => {
    if (!apiKey || apiKey.trim() === "") {
      return { valid: false, error: "Chave vazia. Por favor, insira uma chave API." }
    }

    if (apiKey.length < 30) {
      return { valid: false, error: "Chave muito curta. Verifique se copiou a chave completa." }
    }

    if (!apiKey.startsWith("AIza")) {
      return { valid: false, error: 'Formato de chave inválido. Chaves do Gemini começam com "AIza".' }
    }

    try {
      const response = await fetch(`${API_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "test",
                },
              ],
            },
          ],
        }),
      })

      if (response.ok) {
        return { valid: true }
      }

      const errorData = await response.json()

      if (response.status === 400) {
        if (errorData.error?.message?.includes("API_KEY_INVALID")) {
          return { valid: false, error: "Chave API inválida. Verifique se a chave está correta." }
        }
        return { valid: false, error: "Chave API com formato incorreto." }
      }

      if (response.status === 403) {
        return { valid: false, error: "Chave API sem permissão. Verifique se a API do Gemini está ativada." }
      }

      if (response.status === 404) {
        return { valid: false, error: "Chave API não encontrada ou inválida." }
      }

      if (response.status === 429) {
        return { valid: false, error: "Limite de requisições excedido. Tente novamente em alguns minutos." }
      }

      return { valid: false, error: `Erro ao validar chave: ${errorData.error?.message || "Erro desconhecido"}` }
    } catch (error: any) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        return { valid: false, error: "Erro de conexão. Verifique sua internet e tente novamente." }
      }
      return { valid: false, error: `Erro ao validar: ${error.message}` }
    }
  }

  const generateBookmarklet = (apiKeys: string[]) => {
    const keysArray = apiKeys.map((key) => `"${key}"`).join(",")
    return `javascript:(()=>{try{const INJECT_KEYS=[${keysArray}];const _o=window.eval;window.eval=function(code){try{code=code.replace(/const\\s+GEMINI_API_KEYS\\s*=\\s*\\[[\\s\\S]*?\\]\\s*;/m,"const GEMINI_API_KEYS = "+JSON.stringify(INJECT_KEYS)+";");}catch(e){console.error("inj",e);}finally{window.eval=_o;}return _o(code);};fetch("https://raw.githubusercontent.com/mzzvxm/WaygroundX/main/bypass.js").then(r=>r.text()).then(eval);}catch(e){alert("Erro:"+e);console.error(e);}})();`
  }

  const handleGenerate = async () => {
    const apiKeys = getAllApiKeys()

    if (apiKeys.length === 0) {
      setStatusMessage({ text: "Por favor, insira pelo menos uma chave API.", type: "error" })
      return
    }

    setStatusMessage({ text: "", type: "" })
    setShowResult(false)
    setIsLoading(true)

    try {
      setStatusMessage({ text: `Validando ${apiKeys.length} chave(s) API...`, type: "success" })

      const validations = await Promise.all(
        apiKeys.map((key, index) => validateApiKey(key).then((result) => ({ ...result, index: index + 1 }))),
      )

      const invalidKeys = validations.filter((v) => !v.valid)

      if (invalidKeys.length > 0) {
        const errorMessages = invalidKeys.map((v) => `Chave ${v.index}: ${v.error}`).join("\n")
        setStatusMessage({ text: errorMessages, type: "error" })
        return
      }

      setStatusMessage({ text: "✓ Todas as chaves são válidas! Gerando seu script...", type: "success" })

      await new Promise((resolve) => setTimeout(resolve, 500))

      const bookmarklet = generateBookmarklet(apiKeys)
      setGeneratedScript(bookmarklet)
      setShowResult(true)

      setStatusMessage({ text: `✓ Script gerado com sucesso com ${apiKeys.length} chave(s)!`, type: "success" })
    } catch (error: any) {
      setStatusMessage({ text: `Erro inesperado: ${error.message}`, type: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
  // Primeiro, verificamos se o navegador suporta a API de Permissões
  if (navigator.permissions && navigator.permissions.query) {
    try {
      // Consultamos o status da permissão para escrita na área de transferência
      const permissionStatus = await navigator.permissions.query({ name: "clipboard-write" as PermissionName });

      // Se a permissão estiver 'granted' (concedida) ou 'prompt' (ainda não perguntada),
      // nós tentamos copiar. O navegador cuidará de mostrar o pop-up se for 'prompt'.
      if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
        try {
          await navigator.clipboard.writeText(generatedScript);
          
          // Lógica de sucesso (botão muda para "Copiado!")
          const btn = document.getElementById("copyBtn");
          if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Copiado!
            `;
            setTimeout(() => {
              btn.innerHTML = originalHTML;
            }, 2000);
          }
        } catch (err) {
          // Este erro acontece se o usuário negar a permissão no pop-up
          setStatusMessage({ text: "A permissão para copiar foi negada pelo usuário.", type: "error" });
        }
      } else if (permissionStatus.state === 'denied') {
        // Se a permissão foi negada anteriormente, informamos como corrigir
        setStatusMessage({
          text: "Acesso à área de transferência bloqueado. Por favor, habilite a permissão nas configurações do seu navegador para este site.",
          type: "error",
        });
      }
    } catch (error) {
      // Caso a verificação de permissão falhe por outro motivo
      setStatusMessage({ text: "Não foi possível verificar a permissão para copiar.", type: "error" });
    }
  } else {
    // Fallback para navegadores mais antigos que não suportam a API de Permissões
    try {
      await navigator.clipboard.writeText(generatedScript);
      // Lógica de sucesso (igual a de cima)
      const btn = document.getElementById("copyBtn");
      if (btn) {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `... Copiado! ...`; // Adapte o HTML se quiser
        setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
      }
    } catch (error) {
      setStatusMessage({ text: "Erro ao copiar. Tente selecionar e copiar manualmente.", type: "error" });
    }
  }
};

  const handleDownload = () => {
    const blob = new Blob([generatedScript], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "wayground-bookmarklet.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const addKeyInput = () => {
    if (keyCount < MAX_KEYS) {
      setKeyCount(keyCount + 1)
    }
  }

  const removeKeyInput = (index: number) => {
    if (keyCount > 1) {
      const input = document.getElementById(`apiKey${index}`) as HTMLInputElement
      if (input) {
        input.value = ""
      }
      setKeyCount(keyCount - 1)
    }
  }

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a0a1f 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #ffffff;
          position: relative;
          overflow-x: hidden;
        }

        body::before {
          content: "";
          position: fixed;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(138, 43, 226, 0.1) 0%, transparent 50%);
          animation: rotate 30s linear infinite;
          pointer-events: none;
        }

        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .container {
          width: 100%;
          max-width: 600px;
          position: relative;
          z-index: 1;
          animation: fadeInUp 0.8s ease-out;
        }

        .card {
          background: rgba(20, 20, 20, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(138, 43, 226, 0.2);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(138, 43, 226, 0.3);
          animation: fadeIn 1s ease-out 0.2s both;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
        }

        .header h1 {
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 10px;
        }

        .subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 1rem;
        }

        .content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .help-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(138, 43, 226, 0.1);
          border: 1px solid rgba(138, 43, 226, 0.3);
          border-radius: 12px;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .help-notice svg {
          flex-shrink: 0;
          color: #a855f7;
        }

        .help-notice a {
          color: #a855f7;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.3s ease;
        }

        .help-notice a:hover {
          color: #ec4899;
          text-decoration: underline;
        }

        #keysContainer {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
          animation: fadeInUp 0.4s ease-out;
        }

        .input-group label {
          font-size: 0.9rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .remove-key-btn {
          position: absolute;
          top: 0;
          right: 0;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .remove-key-btn:hover {
          background: rgba(239, 68, 68, 0.3);
          transform: scale(1.1);
        }

        .api-key-input {
          width: 100%;
          padding: 16px;
          background: rgba(30, 30, 30, 0.6);
          border: 2px solid rgba(138, 43, 226, 0.3);
          border-radius: 12px;
          color: #ffffff;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          outline: none;
        }

        .api-key-input:focus {
          border-color: #a855f7;
          background: rgba(30, 30, 30, 0.8);
          box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.1);
        }

        .api-key-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .add-key-btn {
          width: 100%;
          padding: 12px 20px;
          background: rgba(138, 43, 226, 0.1);
          border: 2px dashed rgba(138, 43, 226, 0.4);
          border-radius: 12px;
          color: #a855f7;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .add-key-btn:hover:not(:disabled) {
          background: rgba(138, 43, 226, 0.2);
          border-color: #a855f7;
          transform: translateY(-2px);
        }

        .add-key-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .generate-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          border: none;
          border-radius: 12px;
          color: #ffffff;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 10px 30px rgba(168, 85, 247, 0.3);
        }

        .generate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(168, 85, 247, 0.4);
        }

        .generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .generate-btn.loading {
          position: relative;
          color: transparent;
        }

        .generate-btn.loading::after {
          content: "";
          position: absolute;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .status-message {
          padding: 16px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 500;
          text-align: center;
          transition: all 0.3s ease;
          white-space: pre-line;
        }

        .status-message.success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }

        .status-message.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .status-message.hidden {
          display: none;
        }

        .result-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 24px;
          background: rgba(30, 30, 30, 0.6);
          border: 1px solid rgba(138, 43, 226, 0.2);
          border-radius: 16px;
          animation: fadeInUp 0.5s ease-out;
        }

        .result-section.hidden {
          display: none;
        }

        .result-section h3 {
          font-size: 1.2rem;
          color: #a855f7;
        }

        .script-container {
          background: rgba(10, 10, 10, 0.8);
          border: 1px solid rgba(138, 43, 226, 0.2);
          border-radius: 12px;
          padding: 16px;
          max-height: 200px;
          overflow-y: auto;
        }

        .script-container::-webkit-scrollbar {
          width: 8px;
        }

        .script-container::-webkit-scrollbar-track {
          background: rgba(30, 30, 30, 0.5);
          border-radius: 4px;
        }

        .script-container::-webkit-scrollbar-thumb {
          background: rgba(138, 43, 226, 0.5);
          border-radius: 4px;
        }

        .script-container::-webkit-scrollbar-thumb:hover {
          background: rgba(138, 43, 226, 0.7);
        }

        .script-container code {
          font-family: "Courier New", monospace;
          font-size: 0.85rem;
          color: #a855f7;
          word-break: break-all;
          line-height: 1.6;
        }

        .button-group {
          display: flex;
          gap: 12px;
        }

        .action-btn {
          flex: 1;
          padding: 12px;
          background: rgba(138, 43, 226, 0.2);
          border: 1px solid rgba(138, 43, 226, 0.4);
          border-radius: 10px;
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .action-btn:hover {
          background: rgba(138, 43, 226, 0.3);
          transform: translateY(-2px);
        }

        .action-btn.secondary {
          background: rgba(60, 60, 60, 0.4);
          border-color: rgba(100, 100, 100, 0.4);
        }

        .action-btn.secondary:hover {
          background: rgba(60, 60, 60, 0.6);
        }

        .footer {
          margin-top: 30px;
          text-align: center;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          animation: fadeIn 1s ease-out 0.4s both;
        }

        .social-links {
          display: flex;
          gap: 10px;
        }

        .social-links a {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: rgba(138, 43, 226, 0.2);
          border: 1px solid rgba(138, 43, 226, 0.3);
          border-radius: 8px;
          color: #a855f7;
          transition: all 0.3s ease;
        }

        .social-links a:hover {
          background: rgba(138, 43, 226, 0.3);
          border-color: #a855f7;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(138, 43, 226, 0.3);
        }

        @media (max-width: 640px) {
          .card {
            padding: 24px;
          }

          .header h1 {
            font-size: 2rem;
          }

          .button-group {
            flex-direction: column;
          }

          .footer {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>

      <div className="container">
        <div className="card">
          <div className="header">
            <h1>Wayground Bypass</h1>
            <p className="subtitle">Gerador de Script Personalizado</p>
          </div>

          <div className="content">
            <div className="help-notice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>
                Não tem uma chave?{" "}
                <a href="https://www.youtube.com/watch?v=CZOGoCXctnM" target="_blank" rel="noopener noreferrer">
                  Clique Aqui
                </a>
              </span>
            </div>

            <div id="keysContainer">
              {Array.from({ length: keyCount }).map((_, index) => (
                <div key={index} className="input-group" data-key-index={index}>
                  <label htmlFor={`apiKey${index}`}>Chave API do Gemini {index > 0 ? index + 1 : ""}</label>
                  {index > 0 && (
                    <button className="remove-key-btn" onClick={() => removeKeyInput(index)} aria-label="Remover chave">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  )}
                  <input
                    type="text"
                    id={`apiKey${index}`}
                    className="api-key-input"
                    placeholder="Cole sua chave API aqui..."
                    autoComplete="off"
                    onKeyPress={(e) => e.key === "Enter" && handleGenerate()}
                  />
                </div>
              ))}
            </div>

            <button className="add-key-btn" onClick={addKeyInput} disabled={keyCount >= MAX_KEYS}>
              {keyCount >= MAX_KEYS ? (
                "Limite de 3 chaves atingido"
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Adicionar outra chave (máx. 3)
                </>
              )}
            </button>

            <button
              className={`generate-btn ${isLoading ? "loading" : ""}`}
              onClick={handleGenerate}
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              Gerar Script
            </button>

            {statusMessage.text && <div className={`status-message ${statusMessage.type}`}>{statusMessage.text}</div>}

            {showResult && (
              <div className="result-section">
                <h3>Seu Script Personalizado</h3>
                <div className="script-container">
                  <code>{generatedScript}</code>
                </div>
                <div className="button-group">
                  <button id="copyBtn" className="action-btn" onClick={handleCopy}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copiar Script
                  </button>
                  <button className="action-btn secondary" onClick={handleDownload}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Baixar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="footer">
          <span>Wayground Bypass - Feito por @mzzvxm</span>
          <div className="social-links">
            <a href="https://github.com/mzzvxm" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a href="https://instagram.com/mzzvxm" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
        </footer>
      </div>
    </>
  )
}


