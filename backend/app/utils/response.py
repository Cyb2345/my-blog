from typing import Any


def ok(data: Any = None, message: str = "success") -> dict[str, Any]:
    return {"code": 0, "message": message, "data": data}


def error(status_code: int, message: str, data: Any = None) -> dict[str, Any]:
    return {"code": status_code, "message": message, "data": data}
