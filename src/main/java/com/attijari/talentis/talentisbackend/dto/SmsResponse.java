package com.attijari.talentis.talentisbackend.dto;

public class SmsResponse {
    private boolean success;
    private String message;
    private String phoneNumber;
    private String apiResponse;

    public SmsResponse() {}

    public SmsResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public SmsResponse(boolean success, String message, String phoneNumber, String apiResponse) {
        this.success = success;
        this.message = message;
        this.phoneNumber = phoneNumber;
        this.apiResponse = apiResponse;
    }

    // Getters et Setters
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public String getApiResponse() { return apiResponse; }
    public void setApiResponse(String apiResponse) { this.apiResponse = apiResponse; }
}