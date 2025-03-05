from fastapi import FastAPI
from fastapi.responses import JSONResponse
import navis as nav
import json
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 端口
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/neurons")
def get_neurons(limit: int = 100):  # 添加 limit 参数进行分页
    neurons = nav.example_neurons()
    neuron_data = [{"x": node.x, "y": node.y, "z": node.z} for neuron in neurons[:limit] for node in neuron.nodes.itertuples()]
    return JSONResponse(content=neuron_data)