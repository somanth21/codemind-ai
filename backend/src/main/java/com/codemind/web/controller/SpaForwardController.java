package com.codemind.web.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Single Page Application (SPA) Forwarding Controller.
 * Ensures that direct browser navigation or page refreshes on client-side routes
 * (e.g., /architecture, /reuse, /repositories) forward gracefully to /index.html
 * when the frontend is served directly by Spring Boot in unified deployments.
 */
@Controller
public class SpaForwardController {

    @GetMapping(value = {
            "/",
            "/login",
            "/register",
            "/dashboard",
            "/repositories",
            "/repositories/{path:[^\\.]*}",
            "/architecture",
            "/architecture/{path:[^\\.]*}",
            "/reuse",
            "/reuse/{path:[^\\.]*}",
            "/security",
            "/security/{path:[^\\.]*}",
            "/ai",
            "/ai/{path:[^\\.]*}",
            "/ponytail",
            "/ponytail/{path:[^\\.]*}",
            "/settings",
            "/settings/{path:[^\\.]*}"
    })
    public String forwardClientRoutes() {
        return "forward:/index.html";
    }
}
