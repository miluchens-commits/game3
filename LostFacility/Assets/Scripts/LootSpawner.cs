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

    public void SpawnAllLoot()
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
            Object.Destroy(go.GetComponent<CapsuleCollider>());
            Object.Destroy(go.GetComponent<BoxCollider>());
        }

        go.name = "Loot_" + loot.name;
        go.transform.SetParent(transform);

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
            // Command Center (120,0,150)
            new LootDef { name = "ClassifiedDoc", position = new Vector3(120, 0.5f, 150), rarity = LootRarity.Special },
            new LootDef { name = "OfficerIDCard", position = new Vector3(124, 0.5f, 147), rarity = LootRarity.Rare },
            new LootDef { name = "EncryptedRadio", position = new Vector3(117, 0.5f, 152), rarity = LootRarity.Rare },
            // Armory
            new LootDef { name = "WeaponParts", position = new Vector3(120, 0.5f, 140), rarity = LootRarity.Rare },
            new LootDef { name = "AmmoBox", position = new Vector3(118, 0.5f, 140), rarity = LootRarity.Common },
            new LootDef { name = "ArmorPlate", position = new Vector3(122, 0.5f, 141), rarity = LootRarity.Special },
            // Barracks
            new LootDef { name = "MedKit", position = new Vector3(106, 0.5f, 158), rarity = LootRarity.Common },
            new LootDef { name = "NightVision", position = new Vector3(134, 0.5f, 158), rarity = LootRarity.Rare },
            new LootDef { name = "ProteinBar", position = new Vector3(106, 0.5f, 156), rarity = LootRarity.Common },
            // Garage
            new LootDef { name = "Toolkit", position = new Vector3(138, 0.5f, 144), rarity = LootRarity.Common },
            new LootDef { name = "Battery", position = new Vector3(140, 0.5f, 146), rarity = LootRarity.Common },
            new LootDef { name = "GasCan", position = new Vector3(136, 0.5f, 142), rarity = LootRarity.Rare },
            // Mess Hall
            new LootDef { name = "CannedFood", position = new Vector3(120, 0.5f, 164), rarity = LootRarity.Common },
            new LootDef { name = "WaterBottle", position = new Vector3(122, 0.5f, 166), rarity = LootRarity.Common },
        };
    }

    public void PlaceStorageLoot()
    {
        var existing = new System.Collections.Generic.List<LootDef>(lootItems ?? new LootDef[0]);
        existing.AddRange(new LootDef[] {
            // Main Warehouse (210,0,90)
            new LootDef { name = "IndustrialPart", position = new Vector3(210, 0.5f, 90), rarity = LootRarity.Common },
            new LootDef { name = "ElectronicDevice", position = new Vector3(214, 0.5f, 87), rarity = LootRarity.Rare },
            new LootDef { name = "SpecialMaterial", position = new Vector3(207, 0.5f, 93), rarity = LootRarity.Special },
            new LootDef { name = "ForkliftKey", position = new Vector3(212, 0.5f, 91), rarity = LootRarity.Rare },
            // Warehouse2
            new LootDef { name = "MetalPipes", position = new Vector3(196, 0.5f, 98), rarity = LootRarity.Common },
            new LootDef { name = "CircuitBoard", position = new Vector3(198, 0.5f, 96), rarity = LootRarity.Rare },
            // Fuel Depot
            new LootDef { name = "FuelCanister", position = new Vector3(210, 0.5f, 78), rarity = LootRarity.Common },
            new LootDef { name = "FlammableLiquid", position = new Vector3(208, 0.5f, 78), rarity = LootRarity.Common },
        });
        lootItems = existing.ToArray();
    }

    public void PlaceRadarStationLoot()
    {
        var existing = new System.Collections.Generic.List<LootDef>(lootItems ?? new LootDef[0]);
        existing.AddRange(new LootDef[] {
            // Radar Tower (60,0,230)
            new LootDef { name = "EnemyIntelData", position = new Vector3(60, 2.5f, 230), rarity = LootRarity.Special },
            new LootDef { name = "MilitaryMap", position = new Vector3(68, 0.5f, 236), rarity = LootRarity.Rare },
            new LootDef { name = "EncryptedComms", position = new Vector3(52, 0.5f, 235), rarity = LootRarity.Rare },
            new LootDef { name = "RadarModule", position = new Vector3(60, 5.5f, 230), rarity = LootRarity.Legendary },
            // Generator Shed
            new LootDef { name = "GeneratorFuel", position = new Vector3(60, 0.5f, 222), rarity = LootRarity.Common },
            new LootDef { name = "SparkPlug", position = new Vector3(62, 0.5f, 223), rarity = LootRarity.Common },
        });
        lootItems = existing.ToArray();
    }

    public void PlaceSettlementLoot()
    {
        var existing = new System.Collections.Generic.List<LootDef>(lootItems ?? new LootDef[0]);
        existing.AddRange(new LootDef[] {
            // Abandoned Settlement (180,0,200)
            new LootDef { name = "OldCoin", position = new Vector3(174, 0.5f, 198), rarity = LootRarity.Common },
            new LootDef { name = "Jewelry", position = new Vector3(186, 0.5f, 196), rarity = LootRarity.Rare },
            new LootDef { name = "HiddenCash", position = new Vector3(175, 0.5f, 207), rarity = LootRarity.Special },
            new LootDef { name = "AntiqueVase", position = new Vector3(185, 0.5f, 206), rarity = LootRarity.Rare },
            // Gas Station
            new LootDef { name = "Gasoline", position = new Vector3(180, 0.5f, 191), rarity = LootRarity.Common },
            new LootDef { name = "CarBattery", position = new Vector3(182, 0.5f, 192), rarity = LootRarity.Common },
            // Church
            new LootDef { name = "SilverCross", position = new Vector3(180, 1.5f, 210), rarity = LootRarity.Special },
            new LootDef { name = "HolyBook", position = new Vector3(178, 0.5f, 211), rarity = LootRarity.Rare },
        });
        lootItems = existing.ToArray();
    }

    public void PlaceHelipadLoot()
    {
        var existing = new System.Collections.Generic.List<LootDef>(lootItems ?? new LootDef[0]);
        existing.AddRange(new LootDef[] {
            // Helipad (260,0,170)
            new LootDef { name = "FlightRecorder", position = new Vector3(260, 0.5f, 170), rarity = LootRarity.Legendary },
            new LootDef { name = "PilotHelmet", position = new Vector3(270, 0.5f, 174), rarity = LootRarity.Rare },
            new LootDef { name = "NavigationChart", position = new Vector3(252, 0.5f, 176), rarity = LootRarity.Rare },
            new LootDef { name = "FirstAidKit", position = new Vector3(266, 0.5f, 164), rarity = LootRarity.Common },
            new LootDef { name = "FlareGun", position = new Vector3(258, 0.5f, 166), rarity = LootRarity.Special },
        });
        lootItems = existing.ToArray();
    }

    public void PlaceForestLoot()
    {
        var existing = new System.Collections.Generic.List<LootDef>(lootItems ?? new LootDef[0]);
        existing.AddRange(new LootDef[] {
            // Forest spawn area (45,0,270)
            new LootDef { name = "Mushroom", position = new Vector3(40, 0.3f, 275), rarity = LootRarity.Common },
            new LootDef { name = "Herbs", position = new Vector3(50, 0.3f, 265), rarity = LootRarity.Common },
            new LootDef { name = "RareFlower", position = new Vector3(35, 0.3f, 268), rarity = LootRarity.Rare },
            new LootDef { name = "LostBackpack", position = new Vector3(48, 0.3f, 272), rarity = LootRarity.Special },
        });
        lootItems = existing.ToArray();
    }
}
