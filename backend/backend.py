# backend.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import zarr
from typing import List
import numpy as np
import os
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # 允许所有来源访问
    allow_credentials=True,      # 允许发送 cookies 或认证信息
    allow_methods=["*"],         # 允许所有 HTTP 方法（GET、POST、PUT、DELETE 等）
    allow_headers=["*"],         # 允许所有请求头
)

# === Zarr v3 ===
# ZARR_PATH = r"D:\Datasets\ConVis\dataset_all.zarr" # 这是所有14万个neuron的Path
ZARR_PATH = "../public/dataset_360.zarr"
root = zarr.open_group(store=ZARR_PATH, mode='r')  # lazy load

# === 获取 neuron array 路径（递归）===
def get_all_neuron_arrays(group):
    neuron_keys = []
    count = 0
    start_time = time.time()  # ⏱️ 开始时间
    last_print = start_time

    def recursive_collect(g, prefix=""):
        nonlocal count, last_print
        for key in g.array_keys():
            full_key = f"{prefix}{key}"
            neuron_keys.append(full_key)
            count += 1
            if count % 1000 == 0 or (time.time() - last_print > 5):
                print(f"{count} neuron arrays found...")
                last_print = time.time()
        for key in g.group_keys():
            sub_group = g[key]
            recursive_collect(sub_group, prefix=f"{prefix}{key}/")

    recursive_collect(group)
    
    end_time = time.time()  # ⏱️ 结束时间
    elapsed = end_time - start_time
    print(f"Done. Total: {count} neuron arrays found.")
    print(f"Elapsed time: {elapsed:.2f} seconds.")  # ⏱️ 打印总耗时

    return neuron_keys

ALL_NEURONS = get_all_neuron_arrays(root)
print(f"✅ Zarr v3 loaded: {len(ALL_NEURONS)} neuron arrays from {ZARR_PATH}")

@app.get("/")
def read_root():
    if not ALL_NEURONS:
        raise HTTPException(status_code=404, detail="No neurons found")

    first_id = ALL_NEURONS[0]
    arr = root[first_id]
    preview = arr[:100, :].tolist()
    return {
        "message": f"First neuron: {first_id}",
        "shape": arr.shape,
        "sample_data": preview
    }

@app.get("/neurons") # 查看所有array的名字
def list_neurons():
    return {"neurons": ALL_NEURONS} 
# {"neurons":["swcs/720575940606957257","swcs/720575940606712777","swcs/720575940607321692", ...

@app.get("/neuron/{neuron_id:path}") # 一个个load前端需要的array
def get_chunk(
    neuron_id: str,
    start: int = Query(0, ge=0),
    stop: int = Query(1024, ge=0)
):
    if neuron_id not in ALL_NEURONS:
        raise HTTPException(status_code=404, detail="Neuron not found")

    arr = root[neuron_id]
    if stop > arr.shape[0]:
        stop = arr.shape[0]

    try:
        chunk = arr[start:stop, :].tolist()
        return {
            "neuron": neuron_id,
            "shape": arr.shape,
            "chunk": [start, stop],
            "data": chunk
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
