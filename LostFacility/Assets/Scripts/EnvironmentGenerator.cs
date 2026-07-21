using UnityEngine;

public class EnvironmentGenerator : MonoBehaviour
{
    [Header("Base Walls")]
    public Vector3 baseCenter = new Vector3(120, 0, 150);
    public Vector2 baseSize = new Vector2(50, 45);
    public float wallHeight = 3.5f;
    public Material concreteMaterial;

    [Header("Watchtowers")]
    public Vector3[] towerPositions;

    [Header("Roads")]
    public Material roadMaterial;
    public float roadWidth = 4f;

    [Header("Details")]
    public int treeCount = 80;
    public int rockCount = 60;
    public int lightCount = 30;
    public int barrelCount = 25;

    private System.Random rng = new System.Random(42);

    public void GenerateAll()
    {
        GenerateBaseWalls();
        GenerateWatchtowers();
        GenerateRoads();
        GenerateTrees();
        GenerateRocks();
        GenerateLightPoles();
        GenerateBarrels();
    }

    void GenerateBaseWalls()
    {
        float hw = baseSize.x * 0.5f;
        float hz = baseSize.y * 0.5f;
        Vector3[][] segments = {
            new Vector3[] { new Vector3(-hw, 0, -hz), new Vector3(hw, 0, -hz) },
            new Vector3[] { new Vector3(hw, 0, -hz), new Vector3(hw, 0, hz) },
            new Vector3[] { new Vector3(hw, 0, hz), new Vector3(-hw, 0, hz) },
            new Vector3[] { new Vector3(-hw, 0, hz), new Vector3(-hw, 0, -hz) }
        };

        foreach (var seg in segments)
        {
            Vector3 mid = (seg[0] + seg[1]) * 0.5f + baseCenter;
            float length = Vector3.Distance(seg[0], seg[1]);
            var wall = CreateCube("BaseWall", transform, mid + Vector3.up * wallHeight * 0.5f, new Vector3(length, wallHeight, 0.3f),
                concreteMaterial ?? MakeMat(new Color(0.35f, 0.35f, 0.35f)));
        }

        // Gate openings
        Vector2[] gatePos = { new Vector2(0, -hz), new Vector2(0, hz) };
        foreach (var gp in gatePos)
        {
            Vector3 pos = new Vector3(baseCenter.x + gp.x, 0, baseCenter.z + gp.y);
            CreateCube("GateFrame", transform, pos + Vector3.up * 2f, new Vector3(2.5f, 4f, 0.5f), MakeMat(new Color(0.2f, 0.2f, 0.2f)));
        }

        // Sandbags near gates
        foreach (var gp in gatePos)
        {
            Vector3 pos = new Vector3(baseCenter.x + gp.x, 0, baseCenter.z + gp.y);
            for (int i = -1; i <= 1; i += 2)
            {
                for (int j = 0; j < 3; j++)
                {
                    Vector3 sp = pos + new Vector3(i * 1.5f, 0.15f + j * 0.3f, gp.y > 0 ? -1.5f : 1.5f);
                    CreateCube("Sandbag", transform, sp, new Vector3(0.8f, 0.3f, 0.5f), MakeMat(new Color(0.5f, 0.45f, 0.3f)));
                }
            }
        }

        // Barbed wire rolls near walls
        for (int i = 0; i < 6; i++)
        {
            float t = (i + 0.5f) / 6f;
            float wx = Mathf.Lerp(-hw, hw, t);
            CreateCube("BarbedWire", transform, new Vector3(baseCenter.x + wx, 0.15f, baseCenter.z - hz - 1.5f), new Vector3(1.5f, 0.25f, 0.5f), MakeMat(new Color(0.2f, 0.18f, 0.15f)));
        }
    }

    void GenerateWatchtowers()
    {
        if (towerPositions == null || towerPositions.Length == 0)
        {
            float hw = baseSize.x * 0.5f;
            float hz = baseSize.y * 0.5f;
            towerPositions = new Vector3[] {
                new Vector3(baseCenter.x - hw, 0, baseCenter.z - hz),
                new Vector3(baseCenter.x + hw, 0, baseCenter.z - hz),
                new Vector3(baseCenter.x - hw, 0, baseCenter.z + hz),
                new Vector3(baseCenter.x + hw, 0, baseCenter.z + hz)
            };
        }

        foreach (Vector3 pos in towerPositions)
        {
            GameObject tower = new GameObject("Watchtower");
            tower.transform.SetParent(transform);
            tower.transform.position = pos;

            for (int i = 0; i < 4; i++)
            {
                float ox = (i % 2 == 0 ? -0.8f : 0.8f);
                float oz = (i < 2 ? -0.8f : 0.8f);
                var leg = CreateCylinder("Leg", tower.transform, new Vector3(ox, 2f, oz), new Vector3(0.12f, 2f, 0.12f), MakeMat(new Color(0.3f, 0.3f, 0.3f)));
            }

            CreateCube("Platform", tower.transform, new Vector3(0, 4f, 0), new Vector3(2f, 0.15f, 2f), MakeMat(new Color(0.35f, 0.35f, 0.35f)));

            // Railing posts
            for (int r = 0; r < 8; r++)
            {
                float ang = r * Mathf.PI * 2f / 8;
                float rx = Mathf.Cos(ang) * 0.9f;
                float rz = Mathf.Sin(ang) * 0.9f;
                CreateCube("RailPost", tower.transform, new Vector3(rx, 4.5f, rz), new Vector3(0.05f, 0.5f, 0.05f), MakeMat(new Color(0.3f, 0.3f, 0.3f)));
            }

            // Spotlight
            var spot = CreateCylinder("Spotlight", tower.transform, new Vector3(0.5f, 4.3f, 0.5f), new Vector3(0.15f, 0.1f, 0.15f), MakeMat(new Color(0.8f, 0.8f, 0.6f)));
            var sl = spot.AddComponent<Light>();
            sl.type = LightType.Spot;
            sl.range = 30f;
            sl.intensity = 1.5f;
            sl.spotAngle = 60;
            sl.color = new Color(1f, 0.95f, 0.8f);
            sl.transform.rotation = Quaternion.Euler(60, 0, 0);
        }
    }

    void GenerateRoads()
    {
        Vector3[][] roadPaths = {
            new Vector3[] { new Vector3(45,0,270), new Vector3(120,0,150) },   // Spawn → Base
            new Vector3[] { new Vector3(45,0,270), new Vector3(180,0,200) },   // Spawn → Settlement
            new Vector3[] { new Vector3(120,0,150), new Vector3(210,0,90) },   // Base → Storage
            new Vector3[] { new Vector3(120,0,150), new Vector3(60,0,230) },   // Base → Radar
            new Vector3[] { new Vector3(210,0,90), new Vector3(180,0,200) },   // Storage → Settlement
            new Vector3[] { new Vector3(210,0,90), new Vector3(260,0,170) },   // Storage → Helipad
            new Vector3[] { new Vector3(180,0,200), new Vector3(60,0,230) },   // Settlement → Radar
            new Vector3[] { new Vector3(120,0,150), new Vector3(260,0,170) },  // Base → Helipad
        };

        var rMat = roadMaterial ?? MakeMat(new Color(0.35f, 0.35f, 0.35f));

        foreach (var path in roadPaths)
        {
            CreateRoad(path[0], path[1], rMat);
        }

        // Zone-internal roads (dirt paths)
        Vector3[][] dirtPaths = {
            new Vector3[] { new Vector3(120,0,150), new Vector3(100,0,130) },
            new Vector3[] { new Vector3(210,0,90), new Vector3(200,0,75) },
        };
        var dirtMat = MakeMat(new Color(0.28f, 0.25f, 0.2f));
        foreach (var p in dirtPaths)
        {
            CreateRoad(p[0], p[1], dirtMat, 2f, 0.12f);
        }
    }

    void CreateRoad(Vector3 from, Vector3 to, Material mat, float? overrideWidth = null, float? overrideHeight = null)
    {
        Vector3 mid = (from + to) * 0.5f;
        Vector3 dir = to - from;
        float length = dir.magnitude;
        dir.Normalize();

        float w = overrideWidth ?? roadWidth;
        float h = overrideHeight ?? 0.15f;

        var road = CreateCube("Road", transform, new Vector3(mid.x, h * 0.5f, mid.z), new Vector3(w, h, length), mat);
        road.transform.rotation = Quaternion.LookRotation(dir);

        // Road curbs
        Vector3 perp = Vector3.Cross(dir, Vector3.up).normalized;
        float curbH = 0.25f;
        float curbW = 0.15f;

        var curbL = CreateCube("CurbL", transform, new Vector3(mid.x + perp.x * (w * 0.5f + curbW * 0.5f), curbH * 0.5f, mid.z + perp.z * (w * 0.5f + curbW * 0.5f)),
            new Vector3(curbW, curbH, length), MakeMat(new Color(0.4f, 0.4f, 0.42f)));
        curbL.transform.rotation = Quaternion.LookRotation(dir);

        var curbR = CreateCube("CurbR", transform, new Vector3(mid.x - perp.x * (w * 0.5f + curbW * 0.5f), curbH * 0.5f, mid.z - perp.z * (w * 0.5f + curbW * 0.5f)),
            new Vector3(curbW, curbH, length), MakeMat(new Color(0.4f, 0.4f, 0.42f)));
        curbR.transform.rotation = Quaternion.LookRotation(dir);
    }

    void GenerateTrees()
    {
        var trunkMat = MakeMat(new Color(0.35f, 0.25f, 0.15f));
        var canopyMat = MakeMat(new Color(0.15f, 0.45f, 0.1f));

        for (int i = 0; i < treeCount; i++)
        {
            float tx = (float)rng.NextDouble() * 290f + 5f;
            float tz = (float)rng.NextDouble() * 290f + 5f;

            if (IsInZone(tx, tz)) continue;

            GameObject tree = new GameObject("Tree_" + i);
            tree.transform.SetParent(transform);
            tree.transform.position = new Vector3(tx, 0, tz);

            float trunkH = 1.5f + (float)rng.NextDouble() * 2f;
            float canopyR = 1.0f + (float)rng.NextDouble() * 1.2f;

            var trunk = CreateCylinder("Trunk", tree.transform, new Vector3(0, trunkH * 0.5f, 0), new Vector3(0.08f, trunkH, 0.08f), trunkMat);

            var canopy = CreateSphere("Canopy", tree.transform, new Vector3(0, trunkH + canopyR * 0.4f, 0), Vector3.one * canopyR, canopyMat);
        }
    }

    void GenerateRocks()
    {
        var rockMat = MakeMat(new Color(0.4f, 0.38f, 0.35f));

        for (int i = 0; i < rockCount; i++)
        {
            float rx = (float)rng.NextDouble() * 290f + 5f;
            float rz = (float)rng.NextDouble() * 290f + 5f;

            if (IsInZone(rx, rz)) continue;

            float scale = 0.3f + (float)rng.NextDouble() * 0.8f;
            var rock = CreateSphere("Rock_" + i, transform, new Vector3(rx, scale * 0.3f, rz), Vector3.one * scale, rockMat);
            rock.transform.localScale = new Vector3(scale * (0.7f + (float)rng.NextDouble() * 0.6f), scale * (0.5f + (float)rng.NextDouble() * 0.5f), scale * (0.7f + (float)rng.NextDouble() * 0.6f));
        }
    }

    void GenerateLightPoles()
    {
        var poleMat = MakeMat(new Color(0.2f, 0.2f, 0.22f));
        var lightMat = MakeMat(new Color(0.9f, 0.9f, 0.8f));

        for (int i = 0; i < lightCount; i++)
        {
            float lx = (float)rng.NextDouble() * 280f + 10f;
            float lz = (float)rng.NextDouble() * 280f + 10f;

            if (IsInZone(lx, lz)) continue;

            GameObject pole = new GameObject("LightPole_" + i);
            pole.transform.SetParent(transform);
            pole.transform.position = new Vector3(lx, 0, lz);

            var p = CreateCylinder("Pole", pole.transform, new Vector3(0, 3f, 0), new Vector3(0.06f, 3f, 0.06f), poleMat);
            var l = CreateSphere("Light", pole.transform, new Vector3(0, 4.5f, 0), new Vector3(0.2f, 0.2f, 0.2f), lightMat);

            // Point light
            var pl = l.AddComponent<Light>();
            pl.type = LightType.Point;
            pl.range = 8f;
            pl.intensity = 0.4f;
            pl.color = new Color(1f, 0.95f, 0.8f);
        }
    }

    void GenerateBarrels()
    {
        var barrelMat = MakeMat(new Color(0.25f, 0.3f, 0.2f));
        var barrelMat2 = MakeMat(new Color(0.3f, 0.2f, 0.15f));

        for (int i = 0; i < barrelCount; i++)
        {
            float bx = (float)rng.NextDouble() * 290f + 5f;
            float bz = (float)rng.NextDouble() * 290f + 5f;

            if (IsInZone(bx, bz)) continue;

            var mat = (i % 3 == 0) ? barrelMat2 : barrelMat;
            var barrel = CreateCylinder("Barrel_" + i, transform, new Vector3(bx, 0.4f, bz), new Vector3(0.2f, 0.4f, 0.2f), mat);
        }
    }

    bool IsInZone(float wx, float wz)
    {
        Vector2[] zoneCenters = {
            new Vector2(120, 150),
            new Vector2(210, 90),
            new Vector2(60, 230),
            new Vector2(180, 200),
            new Vector2(260, 170)
        };
        foreach (var zc in zoneCenters)
        {
            if (Vector2.Distance(new Vector2(wx, wz), zc) < 25f) return true;
        }
        return false;
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

    GameObject CreateCylinder(string name, Transform parent, Vector3 pos, Vector3 scale, Material mat)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.name = name;
        go.transform.SetParent(parent);
        go.transform.localPosition = pos;
        go.transform.localScale = scale;
        go.GetComponent<Renderer>().material = mat;
        Object.Destroy(go.GetComponent<CapsuleCollider>());
        return go;
    }

    GameObject CreateSphere(string name, Transform parent, Vector3 pos, Vector3 scale, Material mat)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        go.name = name;
        go.transform.SetParent(parent);
        go.transform.localPosition = pos;
        go.transform.localScale = scale;
        go.GetComponent<Renderer>().material = mat;
        Object.Destroy(go.GetComponent<SphereCollider>());
        return go;
    }

    Material MakeMat(Color c)
    {
        var m = new Material(Shader.Find("Standard"));
        m.color = c;
        return m;
    }
}
