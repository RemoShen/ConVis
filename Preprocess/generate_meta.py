# import csv
# import json

# input_file = 'public/classification.csv'  # 替换成你的文件名
# output_file = 'neuron_meta.js'

# data = []

# with open(input_file, newline='', encoding='utf-8') as csvfile:
#     reader = csv.DictReader(csvfile)
#     for row in reader:
#         entry = {
#             "id": str(int(float(row["root_id"]))),  # 转成不带E的字符串
#             "flow": row["flow"],
#             "super_class": row["super_class"],
#             "class": row["class"],
#             "sub_class": row["sub_class"],
#             "cell_type": row["cell_type"],
#             "hemibrain_type": row["hemibrain_type"],
#             "hemilineage": row["hemilineage"],
#             "side": row["side"],
#             "nerve": row["nerve"]
#         }
#         data.append(entry)

# with open(output_file, 'w', encoding='utf-8') as jsfile:
#     jsfile.write("export const neuronMeta = ")
#     jsfile.write(json.dumps(data, indent=2))


import csv
import json

input_file = 'public/classification.csv'  # 替换为你的CSV文件路径
output_file = 'neuron_meta.js'

neuron_list = []

with open(input_file, newline='') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        neuron = {
            "id": row["root_id"],
            "flow": row["flow"],
            "super_class": row["super_class"],
            "class": row["class"],
            "sub_class": row["sub_class"],
            "cell_type": row["cell_type"],
            "hemibrain_type": row["hemibrain_type"],
            "hemilineage": row["hemilineage"],
            "side": row["side"],
            "nerve": row["nerve"]
        }
        neuron_list.append(neuron)

# js_output = f'export const neuronMeta = {json.dumps(neuron_list, indent=2)};'

# print(js_output)

with open(output_file, 'w', encoding='utf-8') as jsfile:
    jsfile.write("export const neuronMeta = ")
    jsfile.write(json.dumps(neuron_list, indent=2))
