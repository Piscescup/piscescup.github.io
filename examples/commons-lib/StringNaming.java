import io.github.piscescup.util.StringUtils;

public class StringNaming {
    public static void main(String[] args) {
        String table = StringUtils.toSnakeLowerCase("HelloWorld");
        String clazz = StringUtils.toUpperCamel("player_inventory");
        String field = StringUtils.toLowerCamel("PLAYER_LEVEL");

        System.out.println(table);
        System.out.println(clazz);
        System.out.println(field);
    }
}
