const API_BASE_URL = "/api";  // matches Vite proxy

//helper for making API requests   
async function request(endpoint, method, body) {
    const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method,                       // "POST", "GET", etc.
        credentials: "include",       // sends cookies for authentication
        headers: { "Content-Type": "application/json" }, // JSON
        body: body ? JSON.stringify(body) : undefined,  // send body if provided
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "API request failed");
    }

    return res.json().catch(() => null); // parse JSON if present
}

//exported API methods, list of available endpoints that represent backend functionality
export const api = {
    login: (Username, Password) => request("auth/login", "POST", { Username, Password }),
    addUser: (username, email, password, role) =>
        request("users", "POST", { username, email, password, role }),
};

export const geminiApi = {
    sendMessage: async (message) => {
        const res = await fetch("/api/gemini/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });

        if (!res.ok) {
            const error = await res.text();
            throw new Error(error || "Failed to send message to Gemini.");
        }

        return res.json();
    },
};
