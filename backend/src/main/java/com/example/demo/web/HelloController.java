package com.example.demo.web;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class HelloController {

    @GetMapping("/api/hello")
    public String hello(@AuthenticationPrincipal Jwt jwt){
        String username = jwt.getClaimAsString("preferred_username");
        if (username == null ) {
           username = jwt.getSubject();
        }
        return "{ data: 'Hello " + username + "' } ";
    }
}
