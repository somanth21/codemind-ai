package com.codemind;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class CodeMindApplicationTests {

    @Test
    void contextLoads() {
        // Verifies the entire Spring ApplicationContext initializes cleanly
    }
}
