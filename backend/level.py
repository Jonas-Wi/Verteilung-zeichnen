from pydantic import BaseModel

class Level(BaseModel):
    welt: int = 1
    stufe: int = 4