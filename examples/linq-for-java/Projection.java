import io.github.piscescup.linq4j.Linq;

public class Projection {
    public static void main(String[] args) {
        var nameLengths = Linq.of("Alice", "Bob", "Charlie")
            .select(String::length)
            .toList();

        System.out.println(nameLengths);
    }
}
