package com.codemind.security.service;

import com.codemind.security.model.UserPrincipal;
import com.codemind.web.dto.AuthResponse;
import com.codemind.web.dto.ChangePasswordRequest;
import com.codemind.web.dto.LoginRequest;
import com.codemind.web.dto.RegisterRequest;
import com.codemind.web.dto.UserDto;

public interface AuthenticationService {
    AuthResponse login(LoginRequest request, String ipAddress);
    AuthResponse register(RegisterRequest request, String ipAddress);
    void changePassword(String email, ChangePasswordRequest request, String ipAddress);
    UserDto getCurrentUser(UserPrincipal principal);
}
