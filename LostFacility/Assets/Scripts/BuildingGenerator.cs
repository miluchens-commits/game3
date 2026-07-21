using UnityEngine;

[System.Serializable]
public class BuildingDef
{
    public string name;
    public Vector3 position;
    public Vector3 size;
    public Color color = Color.gray;
    public bool hasRoof = true;
    public float wallThickness = 0.2f;
}

[System.Serializable]
public class ZoneDef
{
    public string name;
    public Vector3 center;
    public float radius = 20f;
    public BuildingDef[] buildings;
    public Color groundColor = new Color(0.3f, 0.3f, 0.3f, 0.5f);
}

public class BuildingGenerator : MonoBehaviour
{
    [Header("Zones")]
    public ZoneDef militaryBase;
    public ZoneDef storageArea;
    public ZoneDef radarStation;
    public ZoneDef abandonedSettlement;
    public ZoneDef helipad;

    [Header("Materials")]
    public Material buildingMaterial;
    public Material roofMaterial;
    public Material concreteMaterial;

    void MakeMat(ref Material m, Color c, string shader = "Standard")
    {
        if (m != null) return;
        m = new Material(Shader.Find(shader)) { color = c };
    }

    public void GenerateAll()
    {
        ZoneDef[] zones = new ZoneDef[] { militaryBase, storageArea, radarStation, abandonedSettlement, helipad };
        foreach (var z in zones)
        {
            if (z != null && z.buildings != null && z.buildings.Length > 0)
                GenerateZone(z);
        }
    }

    void GenerateZone(ZoneDef zone)
    {
        GameObject zoneGO = new GameObject(zone.name);
        zoneGO.transform.SetParent(transform);
        zoneGO.transform.position = zone.center;

        foreach (BuildingDef b in zone.buildings)
        {
            if (b.name == "Helipad_")
                GenerateHelipad(b, zoneGO.transform);
            else
                GenerateBuilding(b, zoneGO.transform);
        }

        GenerateZoneFence(zone, zoneGO.transform);
    }

    void GenerateBuilding(BuildingDef b, Transform parent)
    {
        GameObject go = new GameObject(b.name);
        go.transform.SetParent(parent);
        go.transform.localPosition = b.position;

        float hw = b.size.x * 0.5f;
        float hz = b.size.z * 0.5f;
        float halfH = b.size.y * 0.5f;
        float wt = b.wallThickness;
        var wallMat = GetMaterial(b.color);

        // Walls
        Vector3[] wallPos = {
            new Vector3(0, halfH, hz),
            new Vector3(0, halfH, -hz),
            new Vector3(hw, halfH, 0),
            new Vector3(-hw, halfH, 0)
        };
        Vector3[] wallSiz = {
            new Vector3(b.size.x, b.size.y, wt),
            new Vector3(b.size.x, b.size.y, wt),
            new Vector3(wt, b.size.y, b.size.z),
            new Vector3(wt, b.size.y, b.size.z)
        };

        for (int i = 0; i < 4; i++)
        {
            var wall = CreateCube("Wall_" + i, go.transform, wallPos[i], wallSiz[i], wallMat);
            MakeWindows(wall.transform, wallSiz[i], b.size.y);
        }

        // Floor
        CreateCube("Floor", go.transform, new Vector3(0, 0, 0), new Vector3(b.size.x, wt, b.size.z), concreteMaterial);

        // Roof
        if (b.hasRoof)
        {
            CreateCube("Roof", go.transform, new Vector3(0, b.size.y, 0), new Vector3(b.size.x + 0.5f, 0.1f, b.size.z + 0.5f), roofMaterial);

            // Roof details: AC unit
            float acX = Random.Range(-b.size.x * 0.2f, b.size.x * 0.2f);
            float acZ = Random.Range(-b.size.z * 0.2f, b.size.z * 0.2f);
            CreateCube("ACUnit", go.transform, new Vector3(acX, b.size.y + 0.25f, acZ), new Vector3(1f, 0.4f, 0.8f), GetMaterial(new Color(0.3f, 0.3f, 0.3f)));

            // Roof vent
            float vx = Random.Range(-b.size.x * 0.15f, b.size.x * 0.15f);
            float vz = Random.Range(-b.size.z * 0.15f, b.size.z * 0.15f);
            CreateCube("Vent", go.transform, new Vector3(vx, b.size.y + 0.15f, vz), new Vector3(0.4f, 0.2f, 0.4f), GetMaterial(new Color(0.25f, 0.25f, 0.25f)));
        }

        // Door
        CreateCube("DoorFrame", go.transform, new Vector3(0, 1.2f, hz + 0.01f), new Vector3(0.8f, 2f, 0.1f), GetMaterial(new Color(0.15f, 0.15f, 0.15f)));

        // Doorstep
        CreateCube("Doorstep", go.transform, new Vector3(0, 0.05f, hz + 0.15f), new Vector3(1.2f, 0.1f, 0.3f), concreteMaterial);
    }

    void GenerateHelipad(BuildingDef b, Transform parent)
    {
        GameObject go = new GameObject("Helipad");
        go.transform.SetParent(parent);
        go.transform.localPosition = b.position;

        CreateCube("Pad", go.transform, Vector3.zero, new Vector3(12, 0.2f, 12), concreteMaterial);

        float mk = 0.2f;
        float cx = 0;
        float cz = 0;
        // "H" marking (white strips)
        float stripH = 0.05f;
        // Left vertical
        CreateCube("H_Left", go.transform, new Vector3(-2f, stripH, 0), new Vector3(0.8f, stripH, 5f), GetMaterial(Color.white));
        // Right vertical
        CreateCube("H_Right", go.transform, new Vector3(2f, stripH, 0), new Vector3(0.8f, stripH, 5f), GetMaterial(Color.white));
        // Horizontal bar
        CreateCube("H_Bar", go.transform, new Vector3(0, stripH, 0), new Vector3(5.5f, stripH, 0.8f), GetMaterial(Color.white));

        // Circle border
        for (int i = 0; i < 20; i++)
        {
            float angle = i * Mathf.PI * 2f / 20;
            float rx = Mathf.Cos(angle) * 5.5f;
            float rz = Mathf.Sin(angle) * 5.5f;
            CreateCube("Border_" + i, go.transform, new Vector3(rx, stripH, rz), new Vector3(0.3f, stripH, 0.3f), GetMaterial(Color.white));
        }
    }

    void MakeWindows(Transform wall, Vector3 wallSize, float buildingHeight)
    {
        int count = Mathf.FloorToInt(Mathf.Max(wallSize.x, wallSize.z) / 2.5f);
        if (count < 1) count = 1;
        count = Mathf.Min(count, 4);
        float spacing = Mathf.Max(wallSize.x, wallSize.z) / (count + 1);
        float winH = Mathf.Min(0.8f, buildingHeight * 0.35f);
        float winW = Mathf.Min(0.6f, spacing * 0.6f);
        float winY = 1.2f;
        var winMat = GetMaterial(new Color(0.3f, 0.6f, 0.9f, 0.7f));

        bool alongX = wallSize.x > wallSize.z;
        for (int i = 0; i < count; i++)
        {
            float t = (i + 1) * spacing - (Mathf.Max(wallSize.x, wallSize.z) * 0.5f);
            float wx = alongX ? t : 0;
            float wz = alongX ? 0 : t;

            if (alongX && (Mathf.Abs(t) < 0.6f)) continue;
            if (!alongX && (Mathf.Abs(t) < 0.6f)) continue;

            var w = alongX
                ? new Vector3(wx, winY, wallSize.z > 0 ? 0.01f : -0.01f)
                : new Vector3(wallSize.x > 0 ? 0.01f : -0.01f, winY, wz);

            float ww = alongX ? winW : winH;
            float wh = alongX ? winH : winW;
            CreateCube("Win", wall, w, new Vector3(ww, wh, 0.05f), winMat);
        }
    }

    void GenerateZoneFence(ZoneDef zone, Transform parent)
    {
        int postsPerSide = 4;
        float halfR = zone.radius * 0.8f;

        Vector3[] corners = {
            new Vector3(-halfR, 0, -halfR),
            new Vector3(halfR, 0, -halfR),
            new Vector3(halfR, 0, halfR),
            new Vector3(-halfR, 0, halfR)
        };

        var fenceMat = GetMaterial(new Color(0.3f, 0.28f, 0.25f));
        var barrierMat = GetMaterial(new Color(0.25f, 0.25f, 0.25f));

        for (int s = 0; s < 4; s++)
        {
            Vector3 a = corners[s];
            Vector3 b = corners[(s + 1) % 4];
            for (int i = 0; i < postsPerSide; i++)
            {
                float t = i / (float)(postsPerSide - 1);
                Vector3 pos = Vector3.Lerp(a, b, t);
                CreateCube("FencePost", parent, pos + Vector3.up * 1f, new Vector3(0.15f, 2f, 0.15f), fenceMat);

                float nt = (i + 0.5f) / postsPerSide;
                if (nt < 1f)
                {
                    Vector3 bpos = Vector3.Lerp(a, b, nt);
                    Vector3 bdir = (b - a).normalized;
                    float segLen = (b - a).magnitude / postsPerSide;
                    CreateCube("FenceBar", parent, bpos + Vector3.up * 1.5f, new Vector3(segLen * 0.8f, 0.08f, 0.08f), barrierMat);
                    CreateCube("FenceBar2", parent, bpos + Vector3.up * 0.5f, new Vector3(segLen * 0.8f, 0.08f, 0.08f), barrierMat);
                }
            }
        }
    }

    GameObject CreateCube(string name, Transform parent, Vector3 pos, Vector3 scale, Material mat)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = name;
        go.transform.SetParent(parent);
        go.transform.localPosition = pos;
        go.transform.localScale = scale;
        go.GetComponent<Renderer>().material = mat;
        Object.Destroy(go.GetComponent<BoxCollider>());
        return go;
    }

    Material GetMaterial(Color c)
    {
        var mat = new Material(Shader.Find("Standard"));
        mat.color = c;
        return mat;
    }
}
