package com.codemind.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ReuseAnalysisRequest {

    @NotBlank(message = "Query cannot be blank")
    @Size(max = 500, message = "Query cannot exceed 500 characters")
    private String query;

    @Min(value = 1, message = "Limit must be at least 1")
    @Max(value = 50, message = "Limit cannot exceed 50")
    private Integer limit = 10;

    public ReuseAnalysisRequest() {
    }

    public ReuseAnalysisRequest(String query, Integer limit) {
        this.query = query;
        this.limit = limit != null ? limit : 10;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public Integer getLimit() {
        return limit;
    }

    public void setLimit(Integer limit) {
        this.limit = limit;
    }
}
