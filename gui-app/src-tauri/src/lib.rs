use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::{Arc, Mutex};

struct ServerState {
    running: bool,
    port: u16,
}

#[tauri::command]
fn get_server_status(state: tauri::State<Arc<Mutex<ServerState>>>) -> (bool, u16) {
    let state = state.lock().unwrap();
    (state.running, state.port)
}

#[tauri::command]
fn start_server(port: u16, state: tauri::State<Arc<Mutex<ServerState>>>) -> Result<String, String> {
    let mut state = state.lock().unwrap();

    if state.running {
        return Err("Server already running".to_string());
    }

    state.port = port;
    state.running = true;

    Ok(format!("Server would start on port {}", port))
}

#[tauri::command]
fn stop_server(state: tauri::State<Arc<Mutex<ServerState>>>) -> Result<String, String> {
    let mut state = state.lock().unwrap();

    if !state.running {
        return Err("Server not running".to_string());
    }

    state.running = false;

    Ok("Server stopped".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let server_state = Arc::new(Mutex::new(ServerState {
        running: false,
        port: 3000,
    }));

    tauri::Builder::default()
        .manage(server_state)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_server_status,
            start_server,
            stop_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
