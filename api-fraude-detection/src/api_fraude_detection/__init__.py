def main() -> None:
    import uvicorn

    uvicorn.run("api_fraude_detection.main:create_app", factory=True, host="127.0.0.1", port=8000)
