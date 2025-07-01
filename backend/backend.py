from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from pydantic import BaseModel
from typing import Optional, List
import zarr
import numpy as np

# ✅ 在导入之后立即定义 Request Body 用的类
class NeuronBatchRequest(BaseModel):
    ids: List[str]

# ✅ 创建 app
app = FastAPI()

# ✅ 添加 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 初始化 Zarr 数据
ZARR_PATH = "public/dataset_chunk_v3.zarr" # 这是所有14万个neurons，可以改成 dataset_360.zarr
root = zarr.open_group(store=ZARR_PATH, mode='r')
z = root["neuron_array"]
neuron_ids = root.attrs.get("neuron_ids", [])

if len(neuron_ids) != z.shape[0]:
    raise RuntimeError("Mismatch between neuron_ids and array shape")

# ✅ POST endpoint 正确注册
@app.post("/neuron_batch")
def get_neuron_batch_post(request: NeuronBatchRequest):
    id_list = request.ids
    result = {}
    missing = []

    # zarr 全部加载

    for neuron_id in id_list:
        if neuron_id not in neuron_ids:
            missing.append(neuron_id)
            continue
        try:
            idx = neuron_ids.index(neuron_id)
            arr = z[idx]
            result[neuron_id] = arr.tolist()
        except Exception as e:
            print(f"❌ Failed to load {neuron_id}: {e}")

    if missing:
        print(f"⚠️ Missing neurons: {missing}")

    return result


@app.get("/")
def read_root():
    if not neuron_ids:
        raise HTTPException(status_code=404, detail="No neurons found")
    
    arr = z[0]  # shape (10, 7)
    return {
        "message": f"First neuron: {neuron_ids[0]}",
        "shape": arr.shape,
        "sample_data": arr.tolist()
    }

@app.get("/neurons")
def list_neurons():
    return {"neurons": neuron_ids}

@app.get("/neuron/{neuron_id}")
def get_neuron(neuron_id: str):
    if neuron_id not in neuron_ids:
        raise HTTPException(status_code=404, detail="Neuron not found")
    
    idx = neuron_ids.index(neuron_id)
    arr = z[idx]  # shape (10, 7)
    return {
        "neuron": neuron_id,
        "shape": arr.shape,
        "data": arr.tolist()
    }


@app.get("/neuron_batch")
def get_neuron_batch(ids: Optional[str] = Query(None)):
    if ids is None:
        raise HTTPException(status_code=400, detail="No ids provided")

    id_list = ids.split(",")  # ✅ 关键：支持 ?ids=a,b,c 格式

    result = {}
    missing = []

    for neuron_id in id_list:
        if neuron_id not in neuron_ids:
            missing.append(neuron_id)
            continue
        try:
            idx = neuron_ids.index(neuron_id)
            arr = z[idx]
            result[neuron_id] = arr.tolist()
        except Exception as e:
            print(f"❌ Failed to load {neuron_id}: {e}")

    if missing:
        print(f"⚠️ Missing neurons: {missing}")

    return result
