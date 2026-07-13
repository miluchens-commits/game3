using UnityEngine;

[System.Serializable]
public class LootDef
{
    public string name;
    public Vector3 position;
    public LootRarity rarity = LootRarity.Common;
    public GameObject pickupPrefab;
}

public enum LootRarity { Common, Rare, Special, Legendary }

public class LootSpawner : MonoBehaviour
{
    public LootDef[] lootItems;

    [Header("Visual")]
    public Material commonMat;
    public Material rareMat;
    public Material specialMat;
    public Material legendaryMat;

    void Start()
    {
        SpawnAllLoot();
    }

    void SpawnAllLoot()
    {
        if (lootItems == null) return;

        foreach (var loot in lootItems)
        {
            SpawnLoot(loot);
        }
    }

    void SpawnLoot(LootDef loot)
    {
        GameObject go;
        if (loot.pickupPrefab != null)
        {
            go = Instantiate(loot.pickupPrefab, loot.position, Quaternion.identity);
        }
        else
        {
            go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            go.transform.position = loot.position + Vector3.up * 0.3f;
            go.transform.localScale = new Vector3(0.3f, 0.15f, 0.3f);
            go.transform.rotation = Quaternion.Euler(90, 0, 0);
            Destroy(go.GetComponent<CapsuleCollider>());
            Destroy(go.GetComponent<BoxCollider>());
        }

        go.name = "Loot_" + loot.name;
        go.transform.SetParent(transform);

        // Apply rarity color
        var rend = go.GetComponent<Renderer>();
        if (rend != null)
        {
            switch (loot.rarity)
            {
                case LootRarity.Common: rend.material = GetMat(commonMat, new Color(0.6f, 0.6f, 0.6f)); break;
                case LootRarity.Rare: rend.material = GetMat(rareMat, new Color(0.2f, 0.5f, 1f)); break;
                case LootRarity.Special: rend.material = GetMat(specialMat, new Color(1f, 0.7f, 0f)); break;
                case LootRarity.Legendary: rend.material = GetMat(legendaryMat, new Color(1f, 0.2f, 0.5f)); break;
            }
        }

        // Light glow for rare+
        if (loot.rarity >= LootRarity.Rare)
        {
            var light = go.AddComponent<Light>();
            light.type = LightType.Point;
            light.range = 3f;
            light.intensity = 0.5f;
            switch (loot.rarity)
            {
                case LootRarity.Rare: light.color = new Color(0.2f, 0.5f, 1f); break;
                case LootRarity.Special: light.color = new Color(1f, 0.7f, 0f); break;
                case LootRarity.Legendary: light.color = new Color(1f, 0.2f, 0.5f); break;
            }
        }
    }

    Material GetMat(Material pref, Color fallback)
    {
        if (pref != null) return pref;
        var m = new Material(Shader.Find("Standard"));
        m.color = fallback;
        return m;
    }

    public void PlaceMilitaryBaseLoot()
    {
        lootItems = new LootDef[]
        {
            // Command Center (indoors - high value)
            new LootDef { name = "ClassifiedDoc", position = new Vector3(80, 0.5f, 100), rarity = LootRarity.Special },
            new LootDef { name = "OfficerIDCard", position = new Vector3(82, 0.5f, 98), rarity = LootRarity.Rare },
            // Armory
            new LootDef { name = "WeaponParts", position = new Vector3(80, 0.5f, 92), rarity = LootRarity.Rare },
            new LootDef { name = "AmmoBox", position = new Vector3(78, 0.5f, 92), rarity = LootRarity.Common },
            // Barracks
            new LootDef { name = "MedKit", position = new Vector3(70, 0.5f, 106), rarity = LootRarity.Common },
            new LootDef { name = "NightVision", position = new Vector3(90, 0.5f, 106), rarity = LootRarity.Rare },
            // Garage
            new LootDef { name = "Toolkit", position = new Vector3(66, 0.5f, 96), rarity = LootRarity.Common },
            new LootDef { name = "Battery", position = new Vector3(68, 0.5f, 98), rarity = LootRarity.Common },
        };
    }

    public void PlaceStorageLoot()
    {
        // Merge with existing
        var existing = new System.Collections.Generic.List<LootDef>(lootItems ?? new LootDef[0]);
        existing.AddRange(new LootDef[] {
            new LootDef { name = "IndustrialPart", position = new Vector3(140, 0.5f, 60), rarity = LootRarity.Common },
            new LootDef { name = "ElectronicDevice", position = new Vector3(142, 0.5f, 58), rarity = LootRarity.Rare },
            new LootDef { name = "SpecialMaterial", position = new Vector3(138, 0.5f, 62), rarity = LootRarity.Special },
        });
        lootItems = existing.ToArray();
    }

    public void PlaceRadarStationLoot()
    {
        var existing = new System.Collections.Generic.List<LootDef>(lootItems ?? new LootDef[0]);
        existing.AddRange(new LootDef[] {
            new LootDef { name = "EnemyIntelData", position = new Vector3(40, 1.5f, 150), rarity = LootRarity.Special },
            new LootDef { name = "MilitaryMap", position = new Vector3(46, 0.5f, 154), rarity = LootRarity.Rare },
            new LootDef { name = "EncryptedComms", position = new Vector3(34, 0.5f, 153), rarity = LootRarity.Rare },
        });
        lootItems = existing.ToArray();
    }
}
