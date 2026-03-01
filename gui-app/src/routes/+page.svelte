<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from "svelte";

  let serverRunning = false;
  let serverPort = 3000;
  let statusMessage = "";

  let clientConnected = false;
  let connectPort = 3001;
  let username = "";
  let chatMessage = "";
  let messages: { from: string; text: string }[] = [];

  async function getStatus() {
    try {
      const result = await invoke<[boolean, number]>("get_server_status");
      serverRunning = result[0];
      serverPort = result[1];
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleServer() {
    try {
      if (serverRunning) {
        statusMessage = await invoke("stop_server");
        serverRunning = false;
        clientConnected = false;
      } else {
        statusMessage = await invoke("start_server", { port: serverPort });
        serverRunning = true;
        connectToServer(serverPort);
      }
    } catch (e) {
      statusMessage = String(e);
    }
  }

  function connectToServer(port: number) {
    connectPort = port;
    if (serverRunning && port === serverPort) {
      clientConnected = true;
    }
  }

  function sendMessage() {
    if (!chatMessage.trim()) return;
    messages = [...messages, { from: username || "You", text: chatMessage }];
    chatMessage = "";
  }

  onMount(() => {
    getStatus();
  });
</script>

<div class="container">
  <div class="sidebar">
    <div class="sidebar-section">
      <div class="sidebar-header">
        <h2>Server</h2>
      </div>
      <div class="sidebar-content">
        <div class="control-group">
          <label>Port</label>
          <input type="number" bind:value={serverPort} />
        </div>
        <button 
          class="server-btn" 
          class:running={serverRunning}
          on:click={toggleServer}
        >
          {serverRunning ? 'Stop Server' : 'Start Server'}
        </button>
        <div class="status">
          <span class="status-dot" class:active={serverRunning}></span>
          <span>{serverRunning ? 'Online' : 'Offline'}</span>
        </div>
        {#if statusMessage}
          <div class="status-message">{statusMessage}</div>
        {/if}
      </div>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-header">
        <h2>Client</h2>
      </div>
      <div class="sidebar-content">
        <div class="control-group">
          <label>Username</label>
          <input type="text" bind:value={username} placeholder="Enter username" />
        </div>
        <div class="control-group">
          <label>Connect to Port</label>
          <input type="number" bind:value={connectPort} />
        </div>
        <button 
          class="connect-btn"
          class:connected={clientConnected}
          on:click={() => connectToServer(connectPort)}
        >
          {clientConnected ? 'Connected' : 'Connect'}
        </button>
        <div class="status">
          <span class="status-dot" class:active={clientConnected}></span>
          <span>{clientConnected ? `Connected to ${connectPort}` : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  </div>
  
  <div class="main">
    <div class="chat-area">
      <div class="messages">
        {#each messages as msg}
          <div class="message">
            <span class="msg-from">{msg.from}:</span> {msg.text}
          </div>
        {/each}
        {#if messages.length === 0}
          <div class="no-messages">No messages yet. Start chatting!</div>
        {/if}
      </div>
      <div class="chat-input">
        <input 
          type="text" 
          bind:value={chatMessage} 
          placeholder="Type a message..."
          on:keydown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button class="send-btn" on:click={sendMessage}>Send</button>
      </div>
    </div>
  </div>
</div>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
  }

  .container {
    display: flex;
    height: 100vh;
    width: 100vw;
    background-color: #181818;
    position: relative;
    overflow: hidden;
  }

  .sidebar {
    width: 220px;
    background: #111;
    border-right: 1px solid #2a2a2a;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow-y: auto;
  }

  .sidebar-section {
    border-bottom: 1px solid #2a2a2a;
  }

  .sidebar-section:last-child {
    border-bottom: none;
  }

  .sidebar-header {
    padding: 20px;
    border-bottom: 1px solid #2a2a2a;
  }

  .sidebar-header h2 {
    margin: 0;
    color: #00ffc8;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 1px;
  }

  .sidebar-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .control-group label {
    color: #666;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .control-group input {
    padding: 10px 14px;
    font-size: 14px;
    border: 1px solid #333;
    border-radius: 8px;
    background: #1a1a1a;
    color: #00ffc8;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: all 0.2s;
  }

  .control-group input:focus {
    border-color: #00ffc8;
    box-shadow: 0 0 10px rgba(0, 255, 200, 0.1);
  }

  .control-group input::-webkit-outer-spin-button,
  .control-group input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .control-group input[type='number'] {
    -moz-appearance: textfield;
  }

  .server-btn {
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    background: #333;
    color: #888;
    cursor: pointer;
    transition: all 0.3s ease;
    letter-spacing: 0.5px;
  }

  .server-btn:hover {
    background: #3a3a3a;
  }

  .server-btn.running {
    background: #00ffc8;
    color: #111;
  }

  .server-btn.running:hover {
    background: #00e6b4;
  }

  .connect-btn {
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    background: #333;
    color: #888;
    cursor: pointer;
    transition: all 0.3s ease;
    letter-spacing: 0.5px;
  }

  .connect-btn:hover {
    background: #3a3a3a;
  }

  .connect-btn.connected {
    background: #ff6b9d;
    color: #111;
  }

  .connect-btn.connected:hover {
    background: #ff4d8d;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #555;
    font-size: 13px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #444;
    transition: all 0.3s;
  }

  .status-dot.active {
    background: #00ffc8;
    box-shadow: 0 0 8px rgba(0, 255, 200, 0.6);
  }

  .status-message {
    font-size: 12px;
    color: #00ffc8;
    padding: 8px;
    background: rgba(0, 255, 200, 0.1);
    border-radius: 6px;
    text-align: center;
  }

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px;
    box-sizing: border-box;
  }

  .chat-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #111;
    border-radius: 12px;
    border: 1px solid #2a2a2a;
    overflow: hidden;
  }

  .messages {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .message {
    color: #ccc;
    font-size: 14px;
    line-height: 1.5;
  }

  .msg-from {
    color: #00ffc8;
    font-weight: 600;
  }

  .no-messages {
    color: #555;
    text-align: center;
    margin-top: auto;
    margin-bottom: auto;
  }

  .chat-input {
    display: flex;
    gap: 10px;
    padding: 15px;
    border-top: 1px solid #2a2a2a;
    background: #1a1a1a;
  }

  .chat-input input {
    flex: 1;
    padding: 12px 16px;
    font-size: 14px;
    border: 1px solid #333;
    border-radius: 8px;
    background: #222;
    color: #00ffc8;
    outline: none;
    width: auto;
  }

  .chat-input input:focus {
    border-color: #00ffc8;
    box-shadow: 0 0 10px rgba(0, 255, 200, 0.1);
  }

  .send-btn {
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    background: #00ffc8;
    color: #111;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .send-btn:hover {
    background: #00e6b4;
  }

  .container::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
        90deg,
        transparent 49.5%,
        rgba(255, 255, 255, 0.03) 49.5%,
        rgba(255, 255, 255, 0.03) 50.5%,
        transparent 50.5%
      ),
      linear-gradient(
        0deg,
        transparent 49.5%,
        rgba(255, 255, 255, 0.03) 49.5%,
        rgba(255, 255, 255, 0.03) 50.5%,
        transparent 50.5%
      );
    background-size: 50px 50px;
    pointer-events: none;
  }

  input {
    padding: 14px 20px;
    font-size: 15px;
    border: 1px solid #333;
    border-radius: 12px;
    background: #222;
    color: #00ffc8;
    outline: none;
    width: 320px;
    transition: all 0.3s ease;
    letter-spacing: 0.5px;
  }

  input:focus {
    border-color: #00ffc8;
    box-shadow:
      0 0 20px rgba(0, 255, 200, 0.15),
      inset 0 0 10px rgba(0, 255, 200, 0.05);
    background: #1a1a1a;
  }

  input::placeholder {
    color: #555;
  }
</style>
