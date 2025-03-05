from fastapi import FastAPI
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
def get_neurons():
    neurons = nav.example_neurons()
    neuron_data = [{"x": node.x, "y": node.y, "z": node.z} for neuron in neurons for node in neuron.nodes.itertuples()]
    return json.dumps(neuron_data)
